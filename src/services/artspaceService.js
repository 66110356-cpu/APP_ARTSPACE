import { requireSupabase } from '../lib/supabase'

function mapProfile(row, peeperProfile) {
  return {
    id: row.id,
    username: row.username,
    accountType: row.account_type,
    profile: {
      name: row.account_type === 'maker'
        ? row.artist_name
        : peeperProfile?.display_name || row.username,
      role: row.role || 'Digital Artist',
      bio: row.bio || '',
      avatar: row.account_type === 'maker'
        ? row.avatar_url || ''
        : peeperProfile?.avatar_url || '',
      avatarPath: row.account_type === 'maker'
        ? row.avatar_path || ''
        : peeperProfile?.avatar_path || ''
    },
    peeperProfile: {
      displayName: peeperProfile?.display_name || '',
      avatar: peeperProfile?.avatar_url || '',
      avatarPath: peeperProfile?.avatar_path || ''
    }
  }
}

function mapArtwork(row, artistName, likes = 0) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    category: row.category,
    software: row.software || '',
    image: row.image_url || '',
    imagePath: row.image_path,
    artist: artistName,
    artistId: row.owner_id,
    ownerId: row.owner_id,
    artType: row.category === '3D Art' ? '3d' : '2d',
    likes,
    commentsEnabled: row.comments_enabled,
    createdAt: row.created_at
  }
}

export async function getCurrentProfile(userId) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .select('id, username, account_type, artist_name, role, bio, avatar_url, avatar_path')
    .eq('id', userId)
    .single()

  if (error) throw error
  const { data: peeperProfile, error: peeperProfileError } = await client
    .from('peeper_profiles')
    .select('display_name, avatar_url, avatar_path')
    .eq('user_id', userId)
    .maybeSingle()
  if (peeperProfileError) throw peeperProfileError
  return mapProfile(data, peeperProfile)
}

export async function getProfiles() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .select('id, username, account_type, artist_name, role, bio, avatar_url, avatar_path')
    .eq('account_type', 'maker')
    .order('artist_name')

  if (error) throw error
  return data.map(mapProfile)
}

export async function getProfile(profileId) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .select('id, username, account_type, artist_name, role, bio, avatar_url, avatar_path')
    .eq('id', profileId)
    .maybeSingle()

  if (error) throw error
  return data ? mapProfile(data) : null
}

async function mapArtworkRows(rows) {
  if (!rows.length) return []

  const client = requireSupabase()
  const ownerIds = [...new Set(rows.map((row) => row.owner_id))]
  const artworkIds = rows.map((row) => row.id)
  const [{ data: profiles, error: profilesError }, { data: likes, error: likesError }] =
    await Promise.all([
      client.from('profiles').select('id, artist_name').in('id', ownerIds),
      client.from('artwork_likes').select('artwork_id').in('artwork_id', artworkIds)
    ])

  if (profilesError) throw profilesError
  if (likesError) throw likesError

  const artistNames = new Map(profiles.map((profile) => [profile.id, profile.artist_name]))
  const likeCounts = new Map()
  likes.forEach(({ artwork_id }) => {
    likeCounts.set(artwork_id, (likeCounts.get(artwork_id) || 0) + 1)
  })

  return rows.map((row) => mapArtwork(
    row,
    artistNames.get(row.owner_id) || 'Art Maker',
    likeCounts.get(row.id) || 0
  ))
}

export async function getArtworks({
  from = 0,
  to = 39,
  ownerId,
  category,
  artType,
  before
} = {}) {
  const client = requireSupabase()
  let query = client
    .from('artworks')
    .select('id, owner_id, title, description, category, software, image_path, image_url, comments_enabled, created_at')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (ownerId) query = query.eq('owner_id', ownerId)
  if (category) query = query.eq('category', category)
  if (artType === '3d') query = query.eq('category', '3D Art')
  if (artType === '2d') query = query.neq('category', '3D Art')
  if (before) query = query.lt('created_at', before)

  const { data, error } = await query
  if (error) throw error
  return mapArtworkRows(data)
}

export async function getArtwork(artworkId) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('artworks')
    .select('id, owner_id, title, description, category, software, image_path, image_url, comments_enabled, created_at')
    .eq('id', artworkId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return (await mapArtworkRows([data]))[0]
}

function dataUrlToBlob(dataUrl) {
  const [metadata, encoded] = dataUrl.split(',')
  const mimeType = metadata.match(/data:(.*?);base64/)?.[1] || 'image/webp'
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: mimeType })
}

async function uploadImage(userId, dataUrl) {
  const client = requireSupabase()
  const imagePath = `${userId}/${crypto.randomUUID()}.webp`
  const { error } = await client.storage
    .from('artworks')
    .upload(imagePath, dataUrlToBlob(dataUrl), {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false
    })

  if (error) throw error
  const { data } = client.storage.from('artworks').getPublicUrl(imagePath)

  return { imagePath, imageUrl: data.publicUrl }
}

async function removeImage(imagePath) {
  if (!imagePath) return
  const { error } = await requireSupabase().storage
    .from('artworks')
    .remove([imagePath])
  if (error) console.error('Could not remove a replaced image:', error)
}

async function uploadPeeperAvatar(userId, dataUrl) {
  const client = requireSupabase()
  const imagePath = `${userId}/${crypto.randomUUID()}.webp`
  const { error } = await client.storage
    .from('profile-avatars')
    .upload(imagePath, dataUrlToBlob(dataUrl), {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false
    })

  if (error) throw error
  const { data } = client.storage.from('profile-avatars').getPublicUrl(imagePath)
  return { imagePath, imageUrl: data.publicUrl }
}

async function removePeeperAvatar(imagePath) {
  if (!imagePath) return
  const { error } = await requireSupabase().storage
    .from('profile-avatars')
    .remove([imagePath])
  if (error) console.error('Could not remove a replaced Peeper avatar:', error)
}

export async function createArtwork({ userId, image, ...fields }) {
  const client = requireSupabase()
  const uploaded = await uploadImage(userId, image)
  const { data, error } = await client
    .from('artworks')
    .insert({
      owner_id: userId,
      title: fields.title,
      description: fields.description,
      category: fields.category,
      software: fields.software,
      image_path: uploaded.imagePath,
      image_url: uploaded.imageUrl,
      comments_enabled: fields.commentsEnabled
    })
    .select('id, owner_id, title, description, category, software, image_path, image_url, comments_enabled, created_at')
    .single()

  if (error) {
    const { error: cleanupError } = await client.storage
      .from('artworks')
      .remove([uploaded.imagePath])
    if (cleanupError) console.error('Could not clean up an unpublished artwork image:', cleanupError)
    throw error
  }

  return mapArtwork(data, fields.artistName, 0)
}

export async function updateArtwork(artworkId, ownerId, fields) {
  const client = requireSupabase()
  let imageFields = {}
  let uploadedImage
  if (fields.image) {
    uploadedImage = await uploadImage(ownerId, fields.image)
    imageFields = { image_path: uploadedImage.imagePath, image_url: uploadedImage.imageUrl }
  }

  const { data, error } = await client
    .from('artworks')
    .update({
      title: fields.title,
      description: fields.description,
      category: fields.category,
      software: fields.software,
      comments_enabled: fields.commentsEnabled,
      ...imageFields
    })
    .eq('id', artworkId)
    .eq('owner_id', ownerId)
    .select('id, owner_id, title, description, category, software, image_path, image_url, comments_enabled, created_at')
    .single()

  if (error) {
    if (uploadedImage) await removeImage(uploadedImage.imagePath)
    throw error
  }
  if (uploadedImage) await removeImage(fields.previousImagePath)
  return (await mapArtworkRows([data]))[0]
}

export async function deleteArtwork(artwork) {
  const client = requireSupabase()
  const { error } = await client
    .from('artworks')
    .delete()
    .eq('id', artwork.id)
  if (error) throw error

  if (artwork.imagePath) {
    const { error: storageError } = await client.storage
      .from('artworks')
      .remove([artwork.imagePath])
    if (storageError) console.error('Artwork was deleted, but its image could not be removed:', storageError)
  }
}

export async function updateProfile(userId, profile) {
  const client = requireSupabase()
  let avatarUrl = profile.avatar || null
  let avatarPath = profile.avatarPath || null
  let uploadedAvatar
  if (profile.avatar?.startsWith('data:')) {
    uploadedAvatar = await uploadImage(userId, profile.avatar)
    avatarUrl = uploadedAvatar.imageUrl
    avatarPath = uploadedAvatar.imagePath
  }

  const { error } = await client
    .from('profiles')
    .update({
      artist_name: profile.name,
      role: profile.role,
      bio: profile.bio,
      avatar_url: avatarUrl,
      avatar_path: avatarPath
    })
    .eq('id', userId)
  if (error) {
    if (uploadedAvatar) await removeImage(uploadedAvatar.imagePath)
    throw error
  }
  if (uploadedAvatar) await removeImage(profile.avatarPath)
  return getCurrentProfile(userId)
}

export async function updatePeeperProfile(userId, { displayName, avatar }, previousAvatarPath) {
  const normalizedDisplayName = displayName.trim()
  if (!normalizedDisplayName || normalizedDisplayName.length > 40) {
    throw new Error('Peeper display name must be between 1 and 40 characters.')
  }

  const client = requireSupabase()
  const uploadedAvatar = avatar
    ? await uploadPeeperAvatar(userId, avatar)
    : null
  const { data: currentProfile, error: currentProfileError } = await client
    .from('peeper_profiles')
    .select('avatar_url, avatar_path')
    .eq('user_id', userId)
    .maybeSingle()

  if (currentProfileError) {
    if (uploadedAvatar) await removePeeperAvatar(uploadedAvatar.imagePath)
    throw currentProfileError
  }

  const { error } = await client
    .from('peeper_profiles')
    .upsert({
      user_id: userId,
      display_name: normalizedDisplayName,
      avatar_url: uploadedAvatar?.imageUrl || currentProfile?.avatar_url || null,
      avatar_path: uploadedAvatar?.imagePath || currentProfile?.avatar_path || null
    }, { onConflict: 'user_id' })

  if (error) {
    if (uploadedAvatar) await removePeeperAvatar(uploadedAvatar.imagePath)
    throw error
  }

  if (uploadedAvatar) await removePeeperAvatar(previousAvatarPath)
  return getCurrentProfile(userId)
}

export async function getArtistsWithStats() {
  const [profiles, artworks] = await Promise.all([
    getProfiles(),
    getArtworks({ from: 0, to: 999 })
  ])

  return profiles.map((artist) => {
    const artistArtworks = artworks.filter((artwork) => artwork.ownerId === artist.id)
    return {
      ...artist,
      artworks: artistArtworks,
      likes: artistArtworks.reduce((total, artwork) => total + artwork.likes, 0)
    }
  })
}

async function mapCommentRows(rows) {
  const peeperIds = [...new Set(rows
    .filter((row) =>
      row.author_mode === 'peeper' || row.profiles.account_type === 'peeper'
    )
    .map((row) => row.author_id))]
  let peeperNames = new Map()

  if (peeperIds.length) {
    const { data, error } = await requireSupabase()
      .from('peeper_profiles')
      .select('user_id, display_name')
      .in('user_id', peeperIds)
    if (error) throw error
    peeperNames = new Map(data.map((profile) => [profile.user_id, profile.display_name]))
  }

  return rows.map((row) => ({
    id: row.id,
    parentId: row.parent_comment_id,
    authorId: row.author_id,
    author: row.author_mode === 'peeper' || row.profiles.account_type === 'peeper'
      ? peeperNames.get(row.author_id) || row.profiles.username
      : row.profiles.artist_name || row.profiles.username,
    text: row.body,
    createdAt: row.created_at
  }))
}

export async function getComments(artworkId) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('artwork_comments')
    .select('id, author_id, parent_comment_id, author_mode, body, created_at, profiles!artwork_comments_author_id_fkey(username, artist_name, account_type)')
    .eq('artwork_id', artworkId)
    .order('created_at')
  if (error) throw error

  return mapCommentRows(data)
}

export async function addComment(artworkId, authorId, text, parentId = null, authorMode = 'maker') {
  const client = requireSupabase()
  const { data, error } = await client
    .from('artwork_comments')
    .insert({
      artwork_id: artworkId,
      author_id: authorId,
      parent_comment_id: parentId,
      author_mode: authorMode === 'peeper' ? 'peeper' : 'maker',
      body: text
    })
    .select('id, author_id, parent_comment_id, author_mode, body, created_at, profiles!artwork_comments_author_id_fkey(username, artist_name, account_type)')
    .single()
  if (error) throw error

  const [comment] = await mapCommentRows([data])
  return comment
}

export async function getArtworkInteractionState(artworkId, userId) {
  const client = requireSupabase()
  const [{ data: like, error: likeError }, { data: saved, error: savedError }] =
    await Promise.all([
      client.from('artwork_likes').select('artwork_id').eq('artwork_id', artworkId).eq('user_id', userId).maybeSingle(),
      client.from('saved_artworks').select('artwork_id').eq('artwork_id', artworkId).eq('user_id', userId).maybeSingle()
    ])

  if (likeError) throw likeError
  if (savedError) throw savedError
  return { liked: Boolean(like), saved: Boolean(saved) }
}

export async function toggleArtworkLike(artworkId, userId, isLiked) {
  const client = requireSupabase()
  const result = isLiked
    ? await client.from('artwork_likes').delete().eq('artwork_id', artworkId).eq('user_id', userId)
    : await client.from('artwork_likes').insert({ artwork_id: artworkId, user_id: userId })
  if (result.error) throw result.error

  const { count, error } = await client
    .from('artwork_likes')
    .select('artwork_id', { count: 'exact', head: true })
    .eq('artwork_id', artworkId)
  if (error) throw error
  return count || 0
}

export async function toggleSavedArtwork(artworkId, userId, isSaved) {
  const client = requireSupabase()
  const result = isSaved
    ? await client.from('saved_artworks').delete().eq('artwork_id', artworkId).eq('user_id', userId)
    : await client.from('saved_artworks').insert({ artwork_id: artworkId, user_id: userId })
  if (result.error) throw result.error
}

export async function getSavedArtworks(userId) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('saved_artworks')
    .select('artworks(id, owner_id, title, description, category, software, image_path, image_url, comments_enabled, created_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const rows = data.map((record) => record.artworks).filter(Boolean)
  return mapArtworkRows(rows)
}

export async function getFollowState(artistId, userId) {
  const client = requireSupabase()
  const [{ data, error }, { count, error: countError }] = await Promise.all([
    client.from('artist_follows').select('artist_id').eq('artist_id', artistId).eq('follower_id', userId).maybeSingle(),
    client.from('artist_follows').select('artist_id', { count: 'exact', head: true }).eq('artist_id', artistId)
  ])
  if (error) throw error
  if (countError) throw countError
  return { following: Boolean(data), followers: count || 0 }
}

async function getFollowProfiles(column, userId) {
  const client = requireSupabase()
  const { data: follows, error: followsError } = await client
    .from('artist_follows')
    .select(column)
    .eq(column === 'artist_id' ? 'follower_id' : 'artist_id', userId)
    .order('created_at', { ascending: false })
  if (followsError) throw followsError

  const profileIds = follows.map((follow) => follow[column])
  if (!profileIds.length) return []

  const { data: profiles, error: profilesError } = await client
    .from('profiles')
    .select('id, username, account_type, artist_name, role, bio, avatar_url, avatar_path')
    .in('id', profileIds)
  if (profilesError) throw profilesError

  const peeperIds = profiles
    .filter((profile) => profile.account_type === 'peeper')
    .map((profile) => profile.id)
  let peeperAvatars = []
  if (peeperIds.length) {
    const { data, error } = await client
      .from('peeper_profiles')
      .select('user_id, display_name, avatar_url, avatar_path')
      .in('user_id', peeperIds)
    if (error) throw error
    peeperAvatars = data
  }

  const avatarsByUserId = new Map(peeperAvatars.map((avatar) => [avatar.user_id, avatar]))
  const profilesById = new Map(profiles.map((profile) => [
    profile.id,
    mapProfile(profile, avatarsByUserId.get(profile.id))
  ]))
  return profileIds.map((profileId) => profilesById.get(profileId)).filter(Boolean)
}

export async function getFollowedArtists(userId) {
  return getFollowProfiles('artist_id', userId)
}

export async function getArtistFollowers(artistId) {
  return getFollowProfiles('follower_id', artistId)
}

export async function toggleFollow(artistId, userId, isFollowing) {
  const client = requireSupabase()
  const result = isFollowing
    ? await client.from('artist_follows').delete().eq('artist_id', artistId).eq('follower_id', userId)
    : await client.from('artist_follows').insert({ artist_id: artistId, follower_id: userId })
  if (result.error) throw result.error
  return getFollowState(artistId, userId)
}

export function subscribeToNewArtworks(onArtwork) {
  const client = requireSupabase()
  const channel = client
    .channel('public-artwork-feed')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'artworks' }, async ({ new: row }) => {
      try {
        const artwork = await getArtwork(row.id)
        if (artwork) onArtwork(artwork)
      } catch (error) {
        console.error('Could not fetch a newly published artwork:', error)
      }
    })
    .subscribe()

  return () => {
    client.removeChannel(channel)
  }
}
