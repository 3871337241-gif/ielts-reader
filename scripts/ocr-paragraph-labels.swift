import Foundation
import PDFKit
import Vision
import AppKit
// Restore printed gutter letters that full-page OCR can omit. Compress only
// the blank horizontal gap for recognition; do not change any source file.
let args=CommandLine.arguments
let entries=try JSONSerialization.jsonObject(with:Data(contentsOf:URL(fileURLWithPath:args[1]))) as! [[String:Any]]
var docs=[String:PDFDocument](),cached=[String:CGImage](),results=[[String:Any]]()
for e in entries {
 let file=e["pdf"] as! String,number=e["page"] as! Int
 let pageKey="\(file):\(number)"
 if cached[pageKey]==nil {
  if docs[file]==nil {docs[file]=PDFDocument(url:URL(fileURLWithPath:file))}
  let image=docs[file]!.page(at:number-1)!.thumbnail(of:NSSize(width:2400,height:3200),for:.mediaBox)
  var rect=NSRect(origin:.zero,size:image.size)
  cached[pageKey]=image.cgImage(forProposedRect:&rect,context:nil,hints:nil)!
 }
 let cg=cached[pageKey]!,x=e["margin"] as! Double,y=e["y"] as! Double
 let w=Double(cg.width),h=Double(cg.height),top=max(0,y-0.003)
 guard let a=cg.cropping(to:CGRect(x:w*max(0,x-0.085),y:h*top,width:w*(x-0.010-max(0,x-0.085)),height:h*0.024)),let b=cg.cropping(to:CGRect(x:w*(x-0.002),y:h*top,width:w*0.34,height:h*0.024)) else {continue}
 let left=CGContext(data:nil,width:a.width,height:a.height,bitsPerComponent:8,bytesPerRow:a.width*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipLast.rawValue)!
 left.draw(a,in:CGRect(x:0,y:0,width:a.width,height:a.height))
 let pixels=left.data!.assumingMemoryBound(to:UInt8.self)
 var ink=0,minX=a.width,maxX=0
 for cy in 0..<a.height {for cx in 0..<a.width {let p=(cy*a.width+cx)*4;if min(pixels[p],pixels[p+1],pixels[p+2])<130 {ink+=1;minX=min(minX,cx);maxX=max(maxX,cx)}}}
 if ink<25 {continue}
 let leftCrop=a.cropping(to:CGRect(x:max(0,minX-3),y:0,width:min(a.width-1,maxX+3)-max(0,minX-3)+1,height:a.height))!
 let padding=8
 let canvas=CGContext(data:nil,width:leftCrop.width+b.width+padding,height:a.height,bitsPerComponent:8,bytesPerRow:0,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipLast.rawValue)!
 canvas.setFillColor(CGColor(red:1,green:1,blue:1,alpha:1));canvas.fill(CGRect(x:0,y:0,width:leftCrop.width+b.width+padding,height:a.height))
 canvas.draw(leftCrop,in:CGRect(x:0,y:0,width:leftCrop.width,height:leftCrop.height));canvas.draw(b,in:CGRect(x:leftCrop.width+padding,y:0,width:b.width,height:b.height))
 let req=VNRecognizeTextRequest();req.recognitionLevel = .accurate;req.recognitionLanguages=["en-US"];req.usesLanguageCorrection=false;req.customWords=Array("ABCDEFGHIJKLMN").map{String($0)}
 do {
  try VNImageRequestHandler(cgImage:canvas.makeImage()!).perform([req])
  let rows=(req.results ?? []).sorted{ $0.boundingBox.maxY > $1.boundingBox.maxY }
  let text=rows.first?.topCandidates(1).first?.string ?? ""
  results.append(["article":e["article"]!,"page":number,"y":y,"text":e["text"]!,"ocr":text,"ink":ink,"strip":e["strip"]!])
 } catch { print(error) }
 if results.count%25==0 { print("\(results.count) gutter rows read");fflush(stdout) }
}
try JSONSerialization.data(withJSONObject:results,options:[.prettyPrinted,.sortedKeys]).write(to:URL(fileURLWithPath:args[2]))
print("Saved \(results.count) source gutter rows")
