import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import loadEnvironmentVariables from '../../../helpers/environment.js';

const dynamoDB = new DynamoDB({ region: process.env.REGION });
const documentClient = DynamoDBDocument.from(dynamoDB);

const getNewReleases = async (req, res) => {
  await loadEnvironmentVariables();
  const minPopularity = req.query.minPopularity || 0;
  const daysAgo = req.query.daysAgo || 30;
  try {
    let bandcampTables = await fetchBandcampTables();
    let allPopularTracks = [];
    const fetchTracksPromises = bandcampTables.map(async (tableName) => {
      const albums = await fetchAlbums(tableName, minPopularity, daysAgo);
      return processTracks(albums);
    });

    const allTracks = await Promise.all(fetchTracksPromises);
    allTracks.forEach(tracks => {
      allPopularTracks.push(...tracks);
    });

    return allPopularTracks
  } catch (err) {
    console.error('Error processing albums:', err);
    return { message: 'Failed to process albums', err };
  }
};

const fetchBandcampTables = async () => {
  try {
    let result;
    let bandcampTables = [];
    let params = {};
    do {
      result = await dynamoDB.listTables(params);
      bandcampTables.push(...result.TableNames.filter(name => {
        return !name.includes("regroovio-users") && name.includes(process.env.STAGE);
      }));
      params.ExclusiveStartTableName = result.LastEvaluatedTableName;
    } while (result.LastEvaluatedTableName);
    return bandcampTables;
  } catch (err) {
    console.error(`Error listing Bandcamp tables: ${err}`);
    return [];
  }
};

const fetchAlbums = async (tableName, minPopularity, daysAgo) => {
  try {
    const currentDate = new Date();
    const pastDate = new Date();
    pastDate.setDate(currentDate.getDate() - daysAgo);

    const params = {
      TableName: tableName,
      FilterExpression: "popularity >= :minPopularity AND release_date BETWEEN :pastDate AND :currentDate",
      ExpressionAttributeValues: {
        ":minPopularity": minPopularity,
        ":pastDate": pastDate.toISOString(),
        ":currentDate": currentDate.toISOString()
      },
      ScanIndexForward: false,
    };
    const result = await documentClient.scan(params);
    return result.Items
  } catch (err) {
    console.error(`Error fetching albums: ${err}`);
    return [];
  }
};

const processTracks = (albums) => {
  const tracks = [];
  for (const albumItem of albums) {
    if (albumItem.tracks.length > 0) {
      const track = albumItem.tracks.sort((a, b) => {
        const popularityA = a.spotify?.popularity || 0;
        const popularityB = b.spotify?.popularity || 0;
        return popularityB - popularityA;
      })[0];
      const id = track.url;
      const popularity = track?.spotify?.popularity || null;
      const artist = albumItem.artist_name;
      const album_id = albumItem.album_id;
      const album = albumItem.album_name;
      const title = track.name;
      const url = track.url;
      const image = albumItem.image;
      const key_words = albumItem.key_words;
      const release_date = albumItem.release_date;
      tracks.push({ album_id, url, id, title, artist, popularity, album, image, key_words, release_date });
    }
  }
  return tracks;
};

export { getNewReleases }
