const UrlModel = require('../model/urlModel')
const validUrl = require('valid-url')
const RandomString = require('randomstring')
const redis = require("redis");

// Here we create radis server and connect to radis cach memory to use cashing in this code.
const { promisify } = require("util");

const redisClient = redis.createClient(
  15819,
  "redis-15819.c266.us-east-1-3.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("XB9K1HiqkdfJBlgyjj8dSoxrVnLl4PI1", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

const isValid = (value) => {
    if(typeof value === 'undefined' || value === null) return false
    if(typeof value === 'string' && value.trim().length === 0) return false
    if(typeof value === 'number') return false
    return true;
}

//-----------------------Post Api----------------------------------
const generateShortUrl = async function (req, res) {
    try {
        let data = req.body

        if(!isValid(data.longUrl)) return res.status(400).send({ status: false, message: "Please provide long Url first! (type-string)" })

        if (!(validUrl.isWebUri(data.longUrl.trim()))) return res.status(400).send({ status: false, message: "Please Provide a valid long Url" })

        let checkUrl = await UrlModel.findOne({ longUrl: data.longUrl })

        if (checkUrl) return res.status(200).send({ status: true, data: checkUrl })

        let shortUrlCode = RandomString.generate({ length: 6, charset: "alphabetic" }).toLowerCase()

        let shortUrl = `http://localhost:3000/${shortUrlCode}`

        data.urlCode = shortUrlCode;
        data.shortUrl = shortUrl;

        let createUrl = await UrlModel.create(data)

        await SET_ASYNC(`${shortUrlCode}`, JSON.stringify(createUrl))

        return res.status(201).send({ status: true, data: createUrl })

    }
    catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}
//---------------------Get Api-----------------------------------

const getUrl = async function (req, res) {
    try {
        let data = req.params.urlCode

        let catchedUrlData = await GET_ASYNC(`${data}`)
        let parseData = JSON.parse(catchedUrlData)
        
        if(!parseData) return res.status(404).send({status: false, message: "Sort url doesn't exists!"})

        if(catchedUrlData){
            res.status(302).redirect(302, `${parseData.longUrl}`)
        }else{
            let urlData = await UrlModel.findOne({urlCode: data})
            if(!urlData) return res.status(404).send({status: false, message: "Sort url doesn't exists!"})

            await SET_ASYNC(`${data}`, JSON.stringify(urlData))

            res.status(302).redirect(302, `${urlData.longUrl}`)

        }

    }

    catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}

module.exports = { generateShortUrl, getUrl }