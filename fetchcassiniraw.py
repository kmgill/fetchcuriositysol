import os
import sys
import requests
import re
from datetime import datetime
import pickle
from cStringIO import StringIO
from PIL import Image

linkregex = re.compile('<a\s*href=[\'|"](.*?)[\'"].*?>')
takenonregex = re.compile('was taken on .+[^<\n]+')
filterregex = re.compile(' [\w]{2,6} and [\w]{2,6} filters\.')
targetregex = re.compile(' pointing toward .+[^,<\n]+')


def fetchIndexPage(pageNum):
    url = "http://saturn.jpl.nasa.gov/photos/raw/"
    params = {
        "start" : pageNum
    }

    r = requests.get(url, params=params)
    return r.text


def imageIdsOnPage(pageNum):
    t = fetchIndexPage(pageNum)
    links = linkregex.findall(t)
    imageIds = []

    for link in links:
        if "rawimagedetails/index.cfm?imageID=" in link:
            imageID = link[link.index("=")+1:]
            imageIds.append(imageID)
    return imageIds

def fetchImageDetailPage(imageId):
    url = "http://saturn.jpl.nasa.gov/photos/raw/rawimagedetails/index.cfm"
    params = {
        "imageID": imageId
    }
    r = requests.get(url, params=params)
    return r.text, r.url


def fetchImageDetails(imageId):
    t, detailPageUrl = fetchImageDetailPage(imageId)

    m = takenonregex.findall(t)[2][13:]

    takenOn = m[:m.index(" and")]
    month = takenOn[0: takenOn.index(" ")]
    day = takenOn[takenOn.index(" ") + 1:takenOn.index(" ") + 3]
    year = takenOn[takenOn.rindex(" ") + 1:]

    filter0 = "UNK"
    filter1 = "UNK"
    filters = filterregex.findall(m)
    if filters is not None and len(filters) > 0:
        filters = filters[0].split(" ")
        filter0 = filters[1]
        filter1 = filters[3]

    target = targetregex.findall(t)[0]
    target = target[17:-4]

    fullImageUrl = None
    links = linkregex.findall(t)
    for link in links:
        if "casJPGFull" in link:
            fullImageUrl = "http://saturn.jpl.nasa.gov/multimedia/images/raw/%s"%link[link.index("casJPGFull"):]

    camera = None
    if fullImageUrl is not None:
        camera = "WAC" if fullImageUrl[fullImageUrl.rindex("/")+1:][0] == "W" else "NAC"

    return {
        "id": imageId,
        "month": month,
        "day": day,
        "year": year,
        "filter0": filter0,
        "filter1": filter1,
        "target": target,
        "fullImageUrl": fullImageUrl,
        "camera": camera,
        "detailPageUrl": detailPageUrl
    }

def fetchImageToPath(url, path):
    r = requests.get(url)
    f = open(path, "wb")
    f.write(r.content)
    f.close()
    return path

'''
					var saveTo = props.fileId + "_" + props.camera + "_" +
								props.pointedTowards + "_" +
								props.filter1 + "-" + props.filter2 + "_" +
								props.year + "-" + props.month + "-" + props.day + "_" +

								size.width + "x" + size.height +
								".jpg";
                                '''
def createImageDestinationPath(imageDetails, width, height):
    saveTo = """images/cassini/{camera}/{id}_{camera}_{target}_{filter0}_{filter1}_{year}_{month}_{day}_{width}_{height}.jpg""".format(
        id=imageDetails["id"],
        camera=imageDetails["camera"],
        target=imageDetails["target"],
        filter0=imageDetails["filter0"],
        filter1=imageDetails["filter1"],
        year=imageDetails["year"],
        month=imageDetails["month"],
        day=imageDetails["day"],
        width=width,
        height=height
    )
    return saveTo

def getImageDimensions(path):
    im = Image.open(path)
    width, height = im.size
    return width, height

def processImage(imageId):
    imageDetails = fetchImageDetails(imageId)
    if imageDetails["fullImageUrl"] is None:
        print "Cannot determine URL for %s, skipping"%imageDetails["id"]
        return

    path = fetchImageToPath(imageDetails["fullImageUrl"], "temp.jpg")
    width, height = getImageDimensions("temp.jpg")
    imageDest = createImageDestinationPath(imageDetails, width, height)

    if os.path.exists(imageDest):
        print "File Exists:", imageDest
        os.unlink("temp.jpg")
    else:
        print "New Image:", imageDest
        os.rename("temp.jpg", imageDest)

def processPage(pageNum):
    imageIds = imageIdsOnPage(pageNum)
    imageIds.reverse()
    for imageId in imageIds:
        try:
            processImage(imageId)
        except:
            print "Exception while processing", imageId

if __name__ == "__main__":

    for page in range(17, 0, -1):
        processPage(page)
