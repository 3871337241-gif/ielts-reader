import Foundation
import PDFKit
import Vision
import AppKit

// Read-only local Apple Vision OCR, with line boxes retained for column reconstruction.
let args = CommandLine.arguments
guard args.count >= 4, let doc = PDFDocument(url: URL(fileURLWithPath: args[1])) else { fatalError("pdf output-directory page-range") }
let dir=URL(fileURLWithPath: args[2]); try FileManager.default.createDirectory(at:dir,withIntermediateDirectories:true)
let ranges=args[3].split(separator:",").flatMap { value -> [Int] in
    let pair=value.split(separator:"-").compactMap{Int($0)}
    if pair.count==2 { return Array(pair[0]...pair[1]) }; return pair
}
for number in ranges where number > 0 && number <= doc.pageCount {
    let destination=dir.appendingPathComponent(String(format:"%03d.json",number))
    if let data=try? Data(contentsOf:destination),let cached=try? JSONSerialization.jsonObject(with:data) as? [String:Any],let version=cached["columnVersion"] as? Int,version>=3, (version>=5 || cached["twoColumns"] as? Bool != true) { continue }
    autoreleasepool {
        do {
            guard let page=doc.page(at:number-1) else { return }
            let image=page.thumbnail(of:NSSize(width:1800,height:2400),for:.mediaBox)
            var rect=NSRect(origin:.zero,size:image.size)
            guard let cg=image.cgImage(forProposedRect:&rect,context:nil,hints:nil) else { return }
            let request=VNRecognizeTextRequest(); request.recognitionLevel = .accurate
            request.recognitionLanguages=["en-US"]; request.usesLanguageCorrection=true
            try VNImageRequestHandler(cgImage:cg).perform([request])
            func readLines(_ observations:[VNRecognizedTextObservation],_ offset:Double=0,_ scale:Double=1)->[[String:Any]] { observations.compactMap { row -> [String:Any]? in
                guard let c=row.topCandidates(1).first else { return nil }
                let b=row.boundingBox
                return ["text":c.string,"confidence":c.confidence,"x":Double(b.minX)*scale+offset,"y":1-Double(b.maxY),"width":Double(b.width)*scale,"height":Double(b.height)]
            } }
            var lines=readLines(request.results ?? [])
            let wholeLines=lines
            // A continuous white gutter identifies two-column book layouts.
            let w=cg.width,h=cg.height
            let pixels=CGContext(data:nil,width:w,height:h,bitsPerComponent:8,bytesPerRow:w*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipLast.rawValue)!
            pixels.draw(cg,in:CGRect(x:0,y:0,width:w,height:h))
            let bytes=pixels.data!.assumingMemoryBound(to:UInt8.self)
            func ink(_ x:Int)->Double {var n=0,total=0;for y in stride(from:Int(Double(h)*0.3),to:Int(Double(h)*0.86),by:2){let i=(y*w+x)*4;if min(bytes[i],bytes[i+1],bytes[i+2])<200 {n+=1};total+=1};return Double(n)/Double(total)}
            let candidates=Array(stride(from:Int(Double(w)*0.46),through:Int(Double(w)*0.55),by:2))
            func stripe(_ x:Int)->Double { [x-4,x,x+4].map(ink).reduce(0,+)/3 }
            let gutter=candidates.min(by:{stripe($0)<stripe($1)})!
            let nearby=stripe(gutter)
            let sides=[Int(Double(w)*0.25),Int(Double(w)*0.7)].map(ink).max()!
            var split=false,headerCut=0.0
            let leftCount=lines.filter{($0["x"] as! Double)<0.45 && ($0["width"] as! Double)<0.55 && ($0["text"] as! String).split(separator:" ").count>3}.count
            let rightCount=lines.filter{($0["x"] as! Double)>0.48 && ($0["text"] as! String).split(separator:" ").count>3}.count
            if (nearby<0.04 && sides>0.02) || (leftCount>7 && rightCount>7) {
                var columns=[[String:Any]]()
                for (x,width) in [(0,gutter),(gutter,w-gutter)] {
                    let crop=cg.cropping(to:CGRect(x:x,y:0,width:width,height:h))!
                    let columnRequest=VNRecognizeTextRequest();columnRequest.recognitionLevel = .accurate;columnRequest.recognitionLanguages=["en-US"];columnRequest.usesLanguageCorrection=true
                    try VNImageRequestHandler(cgImage:crop).perform([columnRequest])
                    columns+=readLines(columnRequest.results ?? [],Double(x)/Double(w),Double(width)/Double(w))
                }
                let heights=columns.filter{($0["text"] as! String).split(separator:" ").count>5}.map{$0["height"] as! Double}.sorted()
                let bodyHeight=heights.isEmpty ? 0.01 : heights[heights.count/2]
                let headerEnd=lines.filter{($0["y"] as! Double)<0.31 && ((($0["text"] as! String).lowercased().contains("below")) || (($0["height"] as! Double)>bodyHeight*1.6 && ($0["text"] as! String).count<100))}.map{($0["y"] as! Double)+($0["height"] as! Double)}.max() ?? 0
                lines=lines.filter{($0["y"] as! Double)<headerEnd}+columns.filter{($0["y"] as! Double)>=headerEnd}
                split=true;headerCut=headerEnd
            }
            let data=try JSONSerialization.data(withJSONObject:["page":number,"lines":lines,"columnVersion":5,"wholeLines":wholeLines,"twoColumns":split,"gutter":Double(gutter)/Double(w),"headerCut":headerCut],options:[.prettyPrinted,.sortedKeys])
            try data.write(to:destination)
            print("\(URL(fileURLWithPath:args[1]).lastPathComponent) page \(number): \(lines.count) lines"); fflush(stdout)
        } catch { print("ERROR page \(number): \(error)") }
    }
}
