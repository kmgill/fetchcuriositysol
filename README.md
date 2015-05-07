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


# fetchcassiniraw
Fetches all available raw Cassini images. Has no command line options.

## Required Modules:
* image-size

## Running
`node fetchcassiniraw.js`

## Output
Images will be saved in the `images/cassini/<instrument>` directory, where the instrument is either NAC (narrow angle camera) or WAC (wide angle camera). 
Each image will be named in this format: `ID_(W|N)_TARGET_FILTER1_FILTER2_DATE_WIDTHxHEIGHT.jpg`.


# fetchnewhorizonsraw.js
Fetches all available raw New Horizons images. 


##Required Modules:
* cheerio
* image-size

## Running
`node fetchnewhorizonsraw.js <options>`

By default (no command line options), the script will attempt to fetch all available images. 
* `-pg <number>` - Will fetch images on the specified page
* `-to <number>` - Will fetch images from page 1 to the specified page


# fetchgibstiles.js
Fetches and assembles Earth imagery from the NASA/JPL GIBS web service.

##Required Modules:
* ImageMagick (standard command line packages, not Node.js module)

## Running
`node fetchgibstiles.js` - Will fetch for the current date using imagery from the Terra spacecraft. 

`node fetchgibstiles.js <spacecraft>` - Will fetch for the current date using imagery from either the Terra or Aqua spacecraft.

`node fetchgibstiles.js <year> <month> <day> <spacecraft>` - Will fetch for the specified date using the specified spacecraft. If the spacecraft is
omitted, Terra will be used.


