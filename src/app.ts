import * as fs from 'fs';
import * as child_process from 'child_process';
import * as read_line from 'readline';
import * as path from 'path';
import { parse } from 'querystring';

interface DeployServer {
    ip: string;             // That will be the username
    sshUserName: string;    // The username that you use to make an ssh session
}

class App {
    private _watchedPath: string = '';
    private _serverPath: string = '';
    private _changedFiles: string[] = [];
    private _readLineInterface: read_line.ReadLine;
    private _deployServer: DeployServer;
    private _extensions: string[];
    private _uploading: boolean;

    public start(targetPath: string, serverPath: string, sshUserName: string, ip: string, extensions: string[]) {
        this._uploading = false;

        this._deployServer = {
            ip,
            sshUserName
        };
        this._watchedPath = targetPath;
        this._serverPath = serverPath;
        this._extensions = extensions;

        console.log(`
        ========================================================================================================================
            watching: ${targetPath}
        ========================================================================================================================
        `);
        fs.watch(targetPath, {
            recursive: true
        }, this.osEvent);

        this._readLineInterface = read_line.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        this._readLineInterface.on('line', (input) => {
            if (input === 'n') {
                console.log('skipping...');
                this._changedFiles.splice(0, this._changedFiles.length);
                return;
            }
            this.uploadChanges();
        });
    }

    public uploadChanges() {
        if ((this._changedFiles.length === 0) || (this._uploading)) {
            console.log('action ignored...');
            return;
        }

        console.log('uploading...');
        this._uploading = true;
        const uploaded: string[] = [];

        this._changedFiles.forEach((fileName: string) => {
            const parsedPath = path.parse(fileName);
            child_process.execSync(`ssh ${this._deployServer.sshUserName}@${this._deployServer.ip} 'mkdir -p ${this._serverPath}/${parsedPath.dir}'`);
            const uploadingProcess = child_process.spawn('scp', [`${this._watchedPath}/${fileName}`, `${this._deployServer.sshUserName}@${this._deployServer.ip}:${this._serverPath}/${fileName}`]);
            uploadingProcess.stdout.on('data', (data) => {
                console.log(data.toString());
            });
            uploadingProcess.stdin.on('end', (data) => {
                console.log(`${fileName} has been successfully uploaded.`);
                uploaded.push(fileName);
                this.tryReleaseLock(uploaded);

            });
            uploadingProcess.stderr.on('data', (err) => {
                console.log(`${fileName} failed to upload with err: ${err}`);
                uploaded.push(fileName);
                this.tryReleaseLock(uploaded);
            });
        });
    }

    private tryReleaseLock(uploaded: string[]) {
        if (uploaded.length === this._changedFiles.length) {
            this._changedFiles.splice(0, this._changedFiles.length);
            this._uploading = false;
            console.log('ready to listen for changes again...');
        }
    }

    private osEvent = (eventType: string, fileName: string) => {
        if (this._uploading) {
            console.log('please wait for the previous changes to finish uploading...');
            return;
        }

        if (this._changedFiles.indexOf(fileName) === -1) {
            const parsed = path.parse(fileName);
            if (this._extensions.indexOf(parsed.ext) >= 0) {
                this._changedFiles.push(fileName);
                this.displayChangedFiles();
            }
        }
    }

    private displayChangedFiles() {
        console.log('Files to upload: ');
        console.log(this._changedFiles);
        console.log(`
        Hit enter to start uploading to server at path: ${this._serverPath}
        Write n and hit enter to skip these changes.
        `);
    }
}

if (process.argv.length === 7) {
    const targetPath = process.argv[2];
    const serverPathToUpload = process.argv[3];
    const sshUser = process.argv[4];
    const ip = process.argv[5];

    const extensions = process.argv[6].trim().split(',');
    const trimmedExtensions: string[] = [];
    extensions.forEach((extension: string) => {
        trimmedExtensions.push(extension.trim());
    });
    const app = new App();
    app.start(targetPath, serverPathToUpload, sshUser, ip, trimmedExtensions);
} else {
    console.log(`invalid number of arguments.
Usage: node ./js/app.js PathToWatchOnYourMachine PathOnServer sshUser ip "extensions filter"
Example: 
    node ./js/app.js /f/Backend1 /var/www/backend sebastian 133.25.64.32 ".js, .json"
    `);
}
