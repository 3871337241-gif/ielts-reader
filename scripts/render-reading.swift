import Foundation
import PDFKit
import AppKit
let args=CommandLine.arguments
let entries=try JSONSerialization.jsonObject(with:Data(contentsOf:URL(fileURLWithPath:args[1]))) as! [[String:Any]]
var docs=[String:PDFDocument]()
for e in entries {
 let output=URL(fileURLWithPath:e["output"] as! String)

 let file=e["pdf"] as! String
 if docs[file]==nil { docs[file]=PDFDocument(url:URL(fileURLWithPath:file)) }
 var pictures=[CGImage]()
 for part in e["parts"] as! [[String:Any]] {
  let page=docs[file]!.page(at:(part["page"] as! Int)-1)!
  let image=page.thumbnail(of:NSSize(width:1400,height:1900),for:.mediaBox)
  var r=NSRect(origin:.zero,size:image.size)
  let cg=image.cgImage(forProposedRect:&r,context:nil,hints:nil)!
  let top=max(0,(part["top"] as! Double)-0.008),bottom=min(1,(part["bottom"] as! Double)+0.01)
  let clip=CGRect(x:0,y:Double(cg.height)*top,width:Double(cg.width),height:Double(cg.height)*(bottom-top))
  if let cropped=cg.cropping(to:clip) { pictures.append(cropped) }
 }
 guard let width=pictures.map({$0.width}).max(),!pictures.isEmpty else {continue}
 let height=pictures.reduce(0,{$0+$1.height+16})
 let context=CGContext(data:nil,width:width,height:height,bitsPerComponent:8,bytesPerRow:0,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipLast.rawValue)!
 context.setFillColor(CGColor(red:1,green:1,blue:1,alpha:1));context.fill(CGRect(x:0,y:0,width:width,height:height))
 var offset=height
 for picture in pictures { offset-=picture.height;context.draw(picture,in:CGRect(x:0,y:offset,width:picture.width,height:picture.height));offset-=16 }
 let bitmap=NSBitmapImageRep(cgImage:context.makeImage()!)
 try FileManager.default.createDirectory(at:output.deletingLastPathComponent(),withIntermediateDirectories:true)
 try bitmap.representation(using:.jpeg,properties:[.compressionFactor:0.55])!.write(to:output)
 print(output.lastPathComponent);fflush(stdout)
}
