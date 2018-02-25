const supertest = require('supertest')
const { app, server } = require('../index')
const api = supertest(app)
const Blog = require('../models/blog')
const User = require('../models/user')
const { initialBlogs, nonExistingId, blogsInDb, usersInDb } = require('./test_helper')

describe('when there is initially some blogs saved', async() => {
  beforeAll(async () => {
    await Blog.remove({})
    const blogObjects = initialBlogs.map(b => new Blog(b))
    await Promise.all(blogObjects.map(b => b.save()))
  })

  test('all blogs are returned by GET from /api/blogs', async () => {
    const blogsInDatabase = await blogsInDb()

    const response = await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.length).toBe(blogsInDatabase.length)

  })

  test('a specific blog is within the returned blogs', async () => {
    const response = await api
      .get('/api/blogs')

    const contents = response.body.map(r => r.title)

    expect(contents).toContain('Canonical string reduction')
  })

  test('a valid blog can be added ', async () => {
    const newBlog = {
      title: 'New Tracks: Tycho X Portugal. The Man',
      author: 'Scott Hansen',
      url: 'http://blog.iso50.com/35111/new-tracks-tycho-x-portugal-the-man/',
      likes: 8,
    }

    const blogsBefore = await blogsInDb()

    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const blogsAfter = await blogsInDb()
    const contents = blogsAfter.map(r => r.title)

    expect(blogsAfter.length).toBe(blogsBefore.length + 1)
    expect(contents).toContain(newBlog.title)
  })

  test('note without likes property sets likes to 0', async () => {

    const newBlog = {
      title: 'New Tracks: Tycho X Portugal. The Man',
      author: 'Scott Hansen',
      url: 'http://blog.iso50.com/35111/new-tracks-tycho-x-portugal-the-man/'
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect(function(res) {
        expect(res.body.likes).toBe(0)
      })
  })

  test('note without title or url is not added', async () => {
    const newBlog1 = {
      author: 'Bob Loblaw',
      title: 'The Law Blog',
      likes: 60
    }

    const newBlog2 = {
      author: 'Bob Loblaw',
      url: 'http://thelawblog.com',
      likes: 44
    }

    const blogsAtStart = await blogsInDb()

    await api
      .post('/api/blogs')
      .send(newBlog1)
      .expect(400)

    await api
      .post('/api/blogs')
      .send(newBlog2)
      .expect(400)

    const blogsAfterOperation = await blogsInDb()

    expect(blogsAfterOperation.length).toBe(blogsAtStart.length)
  })

  describe('deletion of a blog', async () => {
    let addedBlog

    beforeAll(async () => {
      addedBlog = new Blog({
        title: 'Deletable blog',
        author: 'Admin',
        url: 'http://testblog.com/1',
        likes: 1,
      })

      await addedBlog.save()
    })
    test('DELETE /api/blogs/:id succeeds with proper statuscode', async () => {
      const blogsAtStart = await blogsInDb()

      await api
        .delete(`/api/blogs/${addedBlog._id}`)
        .expect(204)

      const blogsAfterOperation = await blogsInDb()

      const titles = blogsAfterOperation.map(b => b.title)

      expect(titles).not.toContain(addedBlog.title)
      expect(blogsAfterOperation.length).toBe(blogsAtStart.length - 1)
    })
  })

  describe.only('when there is initially one user at db', async () => {
    beforeAll(async () => {
      await User.remove({})
      const user = new User({ username: 'root', password: 'sekret' })
      await user.save()
    })

    test('POST /api/users succeeds with a fresh username', async () => {
      const usersBeforeOperation = await usersInDb()

      const newUser = {
        username: 'macgalis',
        name: 'Markus Juntunen',
        password: 'salainen'
      }

      await api
        .post('/api/users')
        .send(newUser)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const usersAfterOperation = await usersInDb()
      expect(usersAfterOperation.length).toBe(usersBeforeOperation.length+1)
      const usernames = usersAfterOperation.map(u => u.username)
      expect(usernames).toContain(newUser.username)
    })

    test('POST /api/users fails with proper statuscode and message if username already taken', async () => {
      const usersBeforeOperation = await usersInDb()

      const newUser = {
        username: 'root',
        name: 'Superuser',
        password: 'salainen',
        adult: true
      }

      const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(result.body).toEqual({ error: 'username must be unique' })

      const usersAfterOperation = await usersInDb()
      expect(usersAfterOperation.length).toBe(usersBeforeOperation.length)
    })

    test('POST /api/users fails with proper statuscode and message if username is shorter than 3 characters', async () => {
      const usersBeforeOperation = await usersInDb()

      const newUser = {
        username: 'su',
        name: 'Su',
        password: 'salainen',
        adult: true
      }

      const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(result.body).toEqual({ error: 'username has to be atleast 3 characters long' })

      const usersAfterOperation = await usersInDb()
      expect(usersAfterOperation.length).toBe(usersBeforeOperation.length)
    })

    test('POST /api/users sets property adult as true if a Boolean has not been set', async () => {
      const usersBeforeOperation = await usersInDb()

      const newUser = {
        username: 'groot',
        name: 'Superuser',
        password: 'salainen'
      }

      const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(result.body.adult).toEqual(true)

      const usersAfterOperation = await usersInDb()
      expect(usersAfterOperation.length).toBe(usersBeforeOperation.length + 1)
    })

  })

  afterAll(() => {
    server.close()
  })
})
