import fetch from 'node-fetch'
import xml2Json from 'xml2json'

const getLengthData = (length) => {
    const hours = Math.floor(length / 60 / 60);
    const minutes = Math.floor(length / 60) - (hours * 60);
    const seconds = length % 60;
    const formatted = `${hours ? `${hours} hours, ` : ''} ${minutes} minutes and ${seconds} seconds`

    return {
        hours,
        minutes,
        seconds,
        formatted,
    }
}

export const handler = async (event) => {
    const feed = event.queryStringParameters.feed
    const data = await fetch(feed)
        .then(response => response.text())
        .then(str => xml2Json.toJson(str, { object: true }))
        .then(data => {
            const episodes = (Array.isArray(data.rss.channel.item) ? data.rss.channel.item : [data.rss.channel.item])
            const length = episodes.reduce((memo, l) => {
                const duration = l['itunes:duration']
                if (!duration) return memo
                if (!duration.includes(':'))
                {
                    memo += parseInt(duration, 10)
                    return memo
                }
                const parts = duration.split(':').map(d => parseInt(d, 10))
                let seconds = 0
                if (parts.length === 3)
                {
                    seconds += parts[0] * 60 * 60
                    seconds += parts[1] * 60
                    seconds += parts[2]
                } else {
                    seconds += parts[0] * 60
                    seconds += parts[1]
                }
                memo += parseInt(seconds, 10)
                return memo
            }, 0)

            return {
                title: data.rss.channel.title,
                episodes: episodes.length,
                link: data.rss.channel.link,
                artwork: data.rss.channel['itunes:image'] ? data.rss.channel['itunes:image'].href : null,
                duration: getLengthData(length),
                average: getLengthData(Math.floor(length / episodes.length)),
            }
        })

    return {
        headers: {
        'Content-Type': 'application/json',
        },
        statusCode: 200,
        body: JSON.stringify(data)
    }
}
