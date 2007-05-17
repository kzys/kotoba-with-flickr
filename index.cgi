#! /usr/bin/env ruby
$KCODE = 'u'

require 'rexml/document'
require 'net/http'

require 'set'

require 'cgi'
require 'erb'

module Flickr
  class Photo
    def initialize(id, secret, server_id, owner)
      @id = id
      @secret = secret
      @server_id = server_id
      @owner = owner
    end

    def uri
      "http://www.flickr.com/photos/#{@owner}/#{@id}"
    end
    alias :url :uri

    def photo_uri(type = nil)
      if type
        "http://static.flickr.com/#{@server_id}/#{@id}_#{@secret}_#{type}.jpg"
      else
        "http://static.flickr.com/#{@server_id}/#{@id}_#{@secret}.jpg"
      end
    end
    
    def source(type = nil)
      photo_uri({
                  'Square' => 's',
                  'Thumbnail' => 't',
                }[type])
    end
  end

  class Group
    def initialize(client, group_id)
      @client = client
      @group_id = group_id
    end

    def photos(options)
      options['group_id'] = @group_id
      @client.call_method_for_photos('flickr.groups.pools.getPhotos', options)
    end
  end

  class Client
    def initialize(api_key)
      @api_key = api_key
      @http = Net::HTTP.new('www.flickr.com')
    end
    
    def group(group_id)
      Group.new(self, group_id)
    end

    def call_method_for_photos(method, options)
      path = "/services/rest/?method=#{method}&api_key=#{@api_key}"
      options.each do |k, v|
        path += "&#{k}=#{v}"
      end
      resp = @http.get(path)

      doc = REXML::Document.new(resp.body)

      result = []
      REXML::XPath::each(doc, '//photo') do |node|
        attrs = node.attributes
        result.push(Flickr::Photo.new(attrs['id'], attrs['secret'], attrs['server'],
                                      attrs['owner']))
      end

      result
    end
  end
end

class Array
  def random
    if 
self.empty?
      nil
    else
      self[rand(self.length)]
    end
  end
end

class KotobaWithFlickr
  API_KEY = 'cc37de1d98f105b44f7a193b7bb8968c'

  CONVERT_TABLE = {
    'ぎ' => 'き"',
    'げ' => 'け"',
    'ず' => 'す"',
    'ぞ' => 'そ"',
    'ぢ' => 'ち"',
    'づ' => 'つ"',
    'び' => 'ひ"',
    'ぼ' => 'ほ"',

    'ぱ' => 'はo',
    'ぴ' => 'ひo',
    'ぷ' => 'ふo',
    'ぽ' => 'ほo',

    'ぁ' => 'あ',
    'ぃ' => 'い',
    'ぅ' => 'う',
    'ぇ' => 'え',
    'っ' => 'つ',
    'ぉ' => 'お',
    'ゃ' => 'や',
    'ゅ' => 'ゆ',
    'ょ' => 'よ',

    'ギ' => 'キ"',
    'グ' => 'ク"',
    'ゲ' => 'ケ"',
    'ゴ' => 'コ"',
    'ゼ' => 'セ"',
    'ゾ' => 'ソ"',
    'ダ' => 'タ"',
    'ヂ' => 'チ"',
    'ヅ' => 'ツ"',
    'デ' => 'テ"',
    'ブ' => 'フ"',

    'ァ' => 'ア',
    'ィ' => 'イ',
    'ゥ' => 'ウ',
    'ェ' => 'エ',
    'ォ' => 'オ',
    'ッ' => 'ツ',
    'ャ' => 'ヤ',
    'ュ' => 'ユ',
    'ョ' => 'ヨ',

    'ー' => '-',
  }

  def initialize
    client = Flickr::Client.new(API_KEY)
    @hitomoji = client.group('27625409@N00')
    @punctuation = client.group('34231816@N00')
    @oneletter = client.group('27034531@N00')
  end

  def text(str)
    result = []

    str.gsub(/./u) do |c|
      if CONVERT_TABLE[c]
        CONVERT_TABLE[c]
      else
        c
      end
    end.split(//u).each do |c|
      group = nil

      if c == '"'
        group, tag, issmall = @punctuation, 'unquote', true
      elsif c == '-'
        group, tag, issmall = @punctuation, 'hyphen', false
      elsif c == 'o'
        group, tag, issmall = @oneletter, 'o', true
      else
        group, tag, issmall = @hitomoji, c, false
      end

      result << [
        c,
        group.photos('tags' => tag, 'per_page' => 5).random,
        issmall,
      ]
    end

    result
  end
end

app = KotobaWithFlickr.new

begin
  query = CGI.new
  text = query['text']

  print query.header

  if ! text or text.empty?
    tmpl = ERB.new(File.read('index.rhtml'))
    print tmpl.result(binding)
  else
    photos = app.text(text)

    tmpl = ERB.new(File.read('result.rhtml'))
    print tmpl.result(binding)
  end
end
