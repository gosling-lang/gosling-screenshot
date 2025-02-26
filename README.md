# gosling-screenshot

Bulk generation of images from Gosling visualization specifications

```bash
node gosling-screenshot.js <input-dir> <output-dir> [format]
# supported formats: png, jpeg, webp
```

- Processing all JSON files in input directory
- Creating output directory if it doesn't already exist
- Maintaining original filenames with new extension

### Examples
```bash
node gosling-screenshot.js ./input ./output png
```

![Generated Gosling visualization](https://user-images.githubusercontent.com/24403730/163602155-96b48c3b-f9b7-440f-a26c-7ba6fd25782c.jpeg)

