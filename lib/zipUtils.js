
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

/**
   * Get all files list in the workspace which not ignored
   * @param workspaceRootDir the workspace path to submit
   * @param currentDir current directory
   * @param ig the ignore instance
   * @return the files list
   */
const listAllFilesInDir = (workspaceRootDir, currentDir, ig) => {
    let results = [];
    fs.readdirSync(currentDir).forEach((file) => {
        file = path.join(currentDir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!ig.ignores(path.relative(workspaceRootDir, file))) {
                results = results.concat(listAllFilesInDir(workspaceRootDir, file, ig));
            }
        } else {
            if (!ig.ignores(path.relative(workspaceRootDir, file))) {
                results.push(file);
            }
        }
    });
    return results;
}

/**
* Zip all files
* @param workspaceRootDir the workspace path to submit
* @param filesToZip the files to zip
* @param zipFilePath zip file path
*/
const zipFiles = async (workspaceRootDir, filesToZip, zipFilePath) => {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip');
        // listen for all archive data to be written
        output.on('close', () => resolve());
        archive.on('warning', (warning) => console.log(`zip workspace warning: ${warning.toString()}`));
        archive.on('error', (err) => {
            console.log(`zip workspace error: ${err.toString()}`);
            reject(err);
        });
        // pipe archive data to the file
        archive.pipe(output);
        // append files from stream
        filesToZip.forEach((file) => {
            archive.append(fs.createReadStream(file), { name: path.relative(workspaceRootDir, file) });
        });
        // finalize the archive
        archive.finalize();
    });
}

module.exports = {
    zipFiles,
    listAllFilesInDir
}