var Flickr = {};

Flickr.Photo = Class.create({
    initialize: function (photo) {
        this.photo = photo;
    },

    html: function (size) {
        var s = 'http://www.flickr.com/photos/#{owner}/#{id}';
        return new Template(s).evaluate(this.photo);
    },

    jpeg: function (size) {
        var s = 'http://farm#{farm}.static.flickr.com/#{server}/#{id}_#{secret}_#{size}.jpg';
        var obj = Object.clone(this.photo);
        obj.size = size;
        return new Template(s).evaluate(obj);
    }
});

Flickr.Group = Class.create({
    initialize: function (apiKey, groupId) {
        this.apiKey = apiKey;
        this.groupId = groupId;
    },

    searchByTag: function (tag, callback) {
        var funcName = Math.random().toString().replace(/^\d\./, 'anonymous');

        window[funcName] = function (obj) {
            callback(obj);
        }.bind(this);

        var uri = 'http://api.flickr.com/services/rest/?';
        var params = new Hash({
            method: 'flickr.groups.pools.getPhotos',
            api_key: this.apiKey,
            group_id: this.groupId,
            format: 'json',
            jsoncallback: funcName,
            tags: tag
        });

        uri += params.toQueryString();

        var script = document.createElement('script');
        script.src = uri;
        script.type = 'text/javascript';
        document.body.appendChild(script);
    }
});

var KotobaWithFlickr = Class.create({
    createTable: function () {
        var result = {};

        var dakuon = {
            'ぎ': 'き', 'げ': 'け',
            'ず': 'す', 'ぞ': 'そ',
            'ぢ': 'ち', 'づ': 'つ',
            'び': 'ひ', 'ぼ': 'ほ',
            'ギ': 'キ', 'グ': 'ク', 'ゲ': 'ケ', 'ゴ': 'コ',
            'ゼ': 'セ', 'ゾ': 'ソ',
            'ダ': 'タ', 'ヂ': 'チ', 'ヅ': 'ツ', 'デ': 'テ',
            'ブ': 'フ'
        };
        new Hash(dakuon).each(function (pair) {
            result[pair.key] = [
                { tag: pair.value, group: 'hitomoji' },
                { tag: 'unquote',  group: 'punctuation', superscript: true }
            ];
        });

        var handakuon = {
            'ぱ': 'は',
            'ぴ': 'ひ',
            'ぷ': 'ふ',
            'ぽ': 'ほ'
        };
        new Hash(handakuon).each(function (pair) {
            result[pair.key] = [
                { tag: pair.value, group: 'hitomoji' },
                { tag: 'o',        group: 'oneletter', superscript: true }
            ];
        });

        var sokuon = {
            'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お',
            'っ': 'つ',
            'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ',
            'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ',
            'ッ': 'ツ',
            'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ'
        };
        new Hash(sokuon).each(function (pair) {
            result[pair.key] = { tag: pair.value, group: 'hitomoji', small: true };
        });

        result['ー'] = { tag: 'hyphen', group: 'punctuation' };

        return result;
    },

    initialize: function () {
        if (! KotobaWithFlickr.TABLE) {
            KotobaWithFlickr.TABLE = this.createTable();
        }

        var API_KEY = 'cc37de1d98f105b44f7a193b7bb8968c';

        this.groups = {
            hitomoji:    new Flickr.Group(API_KEY, '27625409@N00'),
            punctuation: new Flickr.Group(API_KEY, '34231816@N00'),
            oneletter:   new Flickr.Group(API_KEY, '27034531@N00')
        };
    },

    convert: function (str) {
        $('result').innerHTML = '';

        var self = this;
        str.split(new RegExp('')).each(function (c) {
            var obj = {
                group: 'hitomoji',
                tag: c
            };

            var div = document.createElement('div');
            div.className = 'photo';
            $('result').appendChild(div);

            [ KotobaWithFlickr.TABLE[c] || obj ].flatten().each(function (obj) {
                self.addChar(div, obj);
            });
        });
    },

    addChar: function (parent, args) {
        if (! args.tag)
            return;

        var anchor = document.createElement('a');
        parent.appendChild(anchor);

        var img = document.createElement('img');
        anchor.appendChild(img);

        this.groups[args.group].searchByTag(args.tag, function (obj) {
            var ary = obj.photos.photo;
            if (ary.length == 0)
                return;

            var index = Math.floor(Math.random() * ary.length);
            var photo = new Flickr.Photo(ary[index]);

            anchor.href = photo.html();

            img.src = photo.jpeg((args.small || args.superscript) ? 's' : 'm');
            if (args.superscript) {
                img.className = 'superscript';
            }
        });
    }
});

Event.observe(window, 'load', function () {
    var app = new KotobaWithFlickr;
    $('source').observe('submit', function (e) {
        var str = $$('#source input')[0].value;
        app.convert(str);
        Event.stop(e);
    });

    if (location.hash) {
        var str = location.hash.replace(/^#/, '');
        $$('#source input')[0].value = str;
        app.convert(str);
    }
});
