const express = require('express')
const fetch = require('node-fetch')
const redis = require('redis')
const cors = require('cors')
const path = require('path')

const PORT = process.env.PORT || 5000
const REDIS_PORT = process.env.PORT || 6379

const client = redis.createClient(REDIS_PORT)

const app = express()
app.use(cors())

const publicPath = path.join(__dirname, './public')
app.use(express.static(publicPath))

// Set response
function setResponse(username, repos) {
    let jsObj = { message: `<h1>${username}:lla on ${repos} Github repoa</h1>` }
    let json = JSON.stringify(jsObj)
    return json
}

// Make request to Github for data
async function getRepos(req, res, next) {
    try {
        console.log('Fetching Data...')

        const { username } = req.params

        const response = await fetch(`https://api.github.com/users/${username}`)

        const data = await response.json()

        const repos = data.public_repos

        // Set data to Redis
        client.setex(username, 3600, repos)

        res.send(setResponse(username, repos))
    } catch (err) {
        console.error(err)
        res.status(500)
    }
}

// Cache middleware
function cache(req, res, next) {
    const { username } = req.params;

    client.get(username, (err, data) => {
        if (err) throw err;

        if (data !== null) {
            res.send(setResponse(username, data))
        } else {
            next()
        }
    })
}

app.get('/repos/:username', cache, getRepos)

app.listen(5000, () => {
    console.log(`App listening on port ${PORT}`)
})