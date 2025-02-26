# gosling-screenshot

Bulk generation of images from Gosling visualization specifications

```bash
node gosling-screenshot.js
# Usage: node gosling-screenshot.js [options] <input>
#
# Options:
#   --format=[png|jpeg|webp] Output image format (default: png)
#   --outdir=<directory>     Directory to save the output image
#                             (required if input is a directory, optional otherwise)
#
# Arguments:
#   input                    A Gosling specification file (JSON) or a directory of specifications
```

- Processing all JSON files in input directory
- Creating output directory if it doesn't already exist
- Maintaining original filenames with new extension

### Examples

```bash
node gosling-screenshot.js --format=png --outdir=./output ./input
```

![Generated Gosling visualization](https://user-images.githubusercontent.com/24403730/163602155-96b48c3b-f9b7-440f-a26c-7ba6fd25782c.jpeg)

