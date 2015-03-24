# fetchcuriositysol
Simple Node.js script to fetch raw images from MSL/Curiosity on a particular sol

##Required Modules:
* cheerio
* image-size

## Running
`node fetchcuriosity.js <sol> <instrument>`

Where `<sol>` is the numeric martian day from the start of the mission. Optionally specify `<instrument>` to limit
the fetch to a particular camera. Instrument options are:
* `FHAZ_` - Front Hazard Avoidance Cameras (Front Hazcams)
* `RHAZ_` - Rear Hazard Avoidance Cameras (Rear Hazcams)
* `NAV_LEFT_` - Left Navigation Camera (Navcams)
* `NAV_RIGHT_` - Right Navigation Camera (Navcams)
* `CHEMCAM_` - Chemistry & Camera (ChemCam)
* `MARDI` - Mars Descent Imager (MARDI)
* `MAHLI` - Mars Hand Lens Imager (MAHLI)
* `MAST_` - Mast Camera (Mastcam)


Images will be saved in the `images/<sol>/<instrument>/` directories within the current working path. The script will output a JSON formatted list of image information.
