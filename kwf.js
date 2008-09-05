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
        // $('result').innerHTML = '';

        var self = this;
        str.split(new RegExp('')).each(function (c) {
            var obj = {
                group: 'hitomoji',
                tag: c
            };

            var div = document.createElement('div');
            div.className = 'photo';

            var span = document.createElement('span');
            span.appendChild(document.createTextNode(c));

            div.appendChild(span);
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

            img.onload = function () {
                parent.innerHTML = '';
                parent.appendChild(anchor);
            };
        });
    }
});

var RomanToKana = Class.create({
    initialize: function () {
        this.table = {};

        this.createTable('ぁ', this.createSequence([ 'x', '' ]));
        this.createTable('か', this.createSequence([ 'k', 'g' ]));
        this.createTable('さ', this.createSequence([ 's', 'z' ]));
        this.createTable('た', ['ta', 'da',
                                'ti', 'di',
                                'xtu', 'tu', 'du',
                                'te', 'de',
                                'to', 'do']);
        this.createTable('な', this.createSequence([ 'n' ]));
        this.createTable('は', this.createSequence([ 'h', 'b', 'p' ]));
        this.createTable('ま', this.createSequence([ 'm' ]));
        this.createTable('ゃ', ['xya', 'ya',
                                'xyu', 'yu',
                                'xyo', 'yo']);
        this.createTable('ら', this.createSequence([ 'r' ]));
        this.createTable('ゎ', [ 'xwa', 'wa', 'wyi', 'wye', 'wo']);
        this.table['nn'] = 'ん';

        this.table['tta'] = 'った';
        this.table['tti'] = 'っち';
        this.table['ttu'] = 'っつ';
        this.table['tte'] = 'って';
        this.table['tto'] = 'っと';
        this.table['tya'] = 'ちゃ';
        this.table['tyi'] = 'ちぃ';
        this.table['tyu'] = 'ちゅ';
        this.table['tye'] = 'ちぇ';
        this.table['tyo'] = 'ちょ';

        console.log(this.table);
    },

    createSequence: function (ary) {
        return 'aiueo'.split('').map(function (c2) {
                                         return ary.map(function (c1) {
                                                            return c1 + c2;
                                                        });
                                     }).flatten();
    },

    createTable: function (begin, keys) {
        var self = this;
        keys.each(function (key) {
            self.table[key] = begin;
            begin = begin.succ();
        });
    },

    convert: function (kana) {
        return this.table[kana];
    }
});

Event.observe(window, 'load', function () {
    var app = new KotobaWithFlickr;
    var input = $('preedit');
    var romanToKana = new RomanToKana;
    input.observe('keyup', function (e) {
      var kana = romanToKana.convert(input.value);
      if (kana) {
          app.convert(kana);
          input.value = '';
      }
    });
    input.observe('keydown', function (e) {
      if (e.keyCode == Event.KEY_BACKSPACE && input.value == '') {
          var photos = $$('#result .photo');
          var photo = photos[photos.length-1];
          photo.parentNode.removeChild(photo);
      }
    });

                  input.focus();
});
