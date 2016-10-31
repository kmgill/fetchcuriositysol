import os
import sys
import requests
import re
from datetime import datetime
import pickle
from cStringIO import StringIO
from PIL import Image
import multiprocessing as mp
from multiprocessing.pool import ThreadPool

RAW_IMAGE_TEMP_FILE = "tmp/temp_cassini.jpg"

def fetchImageToPath(uri, path=RAW_IMAGE_TEMP_FILE):
    url = "http://saturnraw.jpl.nasa.gov/%s"%uri
    r = requests.get(url)
    f = open(path, "wb")
    f.write(r.content)
    f.close()
    return path

def fetchPage(pageNum=1):
    url="http://saturnraw.jpl.nasa.gov/cassiniapi/raw/"
    params = {
        "page":pageNum
    }
    r = requests.get(url, params=params)
    return r.json()

def processImage(item):
    #print item

    saveTo = "images/cassini/%s_%s_%s_%s_%s.jpg"%(item['filename'][:-4], item["target"], item["filter1"], item["filter2"], item["observeDate"][0:10])
    print saveTo
    fetchImageToPath(item["browse"], saveTo)

if __name__ == "__main__":

    for page in range(10, 0, -1):
        items = fetchPage(page)
        items = items["DATA"]
        items.reverse()
        for item in items:
            processImage(item)
