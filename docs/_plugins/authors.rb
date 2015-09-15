# This transforms the data associated with each post, specifically the author.
# We store our author information in a yaml file and specify the keys in The
# post front matter. Instead of looking up the complete data each time we need
# it, we'll just look it up here and assign. This plays nicely with tools like
# jekyll-feed which expect post.author to be in a specific format.
module Authors
  class Generator < Jekyll::Generator
    def generate(site)
      site.posts.each do |post|
        post.data['author'] = site.data['authors'][post['author']]
      end
    end
  end
end
