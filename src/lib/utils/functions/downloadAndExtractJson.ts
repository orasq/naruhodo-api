import fetch from 'node-fetch';
import fs from 'fs';
import unzipper from 'unzipper';
import path from 'path';
import { RawJMDict } from '../../types/types';

export async function downloadAndExtractJson(
  jsonUrl: string,
  fileName: string,
  outputPath: string,
): Promise<RawJMDict | undefined> {
  const outputDir = path.resolve(path.dirname(outputPath));
  console.log({ outputDir, outputPath });

  const zipFilePath = path.join(outputDir, 'jmdict.zip');

  let parsedJson; // store the parsed JSON data to be returned

  try {
    // check if output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // download the zip file
    console.log('Downloading zip file...');
    const response = await fetch(jsonUrl);
    const fileStream = fs.createWriteStream(zipFilePath);

    await new Promise((resolve, reject) => {
      response.body?.pipe(fileStream);
      response.body?.on('error', reject);
      fileStream.on('finish', resolve);
    });

    // extract the zip file
    console.log('Extracting zip file...');
    await new Promise((resolve, reject) => {
      fs.createReadStream(zipFilePath)
        .pipe(unzipper.Extract({ path: outputDir }))
        .on('close', resolve)
        .on('error', reject);
    });

    // read the extracted JSON file
    const jsonFilePath = path.join(outputDir, fileName);

    if (fs.existsSync(jsonFilePath)) {
      const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
      parsedJson = JSON.parse(jsonData);
    } else {
      console.error('JSON file not found after extraction.');
      return undefined;
    }

    // delete the .zip and .json files after extraction
    fs.unlinkSync(zipFilePath);
    fs.unlinkSync(jsonFilePath);
    console.log('Cleanup complete.');

    return parsedJson;
  } catch (err) {
    console.error('Error:', err);
  }
}
