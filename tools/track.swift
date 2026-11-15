import AVFoundation
import Vision
import Foundation
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let asset = AVURLAsset(url: url)
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
let dur = CMTimeGetSeconds(asset.duration)
let fps = 30000.0/1001.0
var out: [[String: Any]] = []
var t = 0.0
while t < dur {
  let cg = try! gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 60000), actualTime: nil)
  let face = VNDetectFaceRectanglesRequest()
  face.revision = VNDetectFaceRectanglesRequestRevision3
  let body = VNDetectHumanRectanglesRequest()
  body.upperBodyOnly = true
  try! VNImageRequestHandler(cgImage: cg).perform([face, body])
  func boxes(_ r: [VNDetectedObjectObservation]?) -> [[Double]] {
    (r ?? []).map { o in let b = o.boundingBox; return [b.minX, 1 - b.maxY, b.width, b.height, Double(o.confidence)].map { ($0 * 1000).rounded() / 1000 } }
  }
  out.append(["t": (t*1000).rounded()/1000, "faces": boxes(face.results), "bodies": boxes(body.results)])
  t += 1.0/fps
}
let d = try! JSONSerialization.data(withJSONObject: out)
FileManager.default.createFile(atPath: CommandLine.arguments[2], contents: d)
print("frames", out.count)
