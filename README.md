# changes-uploader
A simple watcher that informs you about the modified files in your project and allows you to upload them fast with one press.

# prerequisites
1. You need to create an ssh key and upload this key to your staging server so that you can make ssh sessions without a password.
   This article can help in doing that: https://www.digitalocean.com/community/tutorials/how-to-set-up-ssh-keys--2

2. You need bash shell commands. If on window, GitBash is recommended. 

3. Install Node.js on your machine


# how to use
1. npm run watch                will run typescript watcher
2. node ./js/app.js [PathToWatchOnYourMachine] [PathOnServer] [sshUser] [ip]

Usage: node ./js/app.js PathToWatchOnYourMachine PathOnServer sshUser ip "extensions filter"

Example: 
    node ./js/app.js /f/Backend1 /var/www/backend sebastian 133.25.64.32 ".js, .json"
