const User = require('./User');
const Song = require('./Song');
const Artist = require('./Artist');
const Playlist = require('./playlist');
const LikedSong = require('./likedsong');


//one-to-many
Artist.hasMany(Song);
Song.belongsTo(Artist);

// one-to-many
User.hasMany(Playlist);
Playlist.belongsTo(User);

// many-to-many
Playlist.belongsToMany(Song, { through: 'PlaylistSongs' });
Song.belongsToMany(Playlist, { through: 'PlaylistSongs' });

//many-to-many
User.belongsToMany(Song, { through: LikedSong });
Song.belongsToMany(User, { through: LikedSong });

module.exports = {
  sequelize,
  User,
  Song,
  Artist,
  Playlist,
  LikedSong
};