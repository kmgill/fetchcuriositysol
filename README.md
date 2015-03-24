# fetchcuriositysol
Simple Node.js script to fetch raw images from MSL/Curiosity on a particular sol

##Required Modules:
* cheerio
* image-size

## Running
`node fetchcuriosity.js <sol>`

Where `<sol>` is the numeric martian day from the start of the mission. Images will be saved in the `images/<sol>/<instrument>/` directories within the current working path. The script will output a JSON formatted list of image information.
