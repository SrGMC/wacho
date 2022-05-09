var emoji = require('node-emoji');

const emojiMap = {
    '0': ':eggplant:',
    '1': ':banana:',
    '2': ':apple:',
    '3': ':popcorn:',
    '4': ':beer:',
    '5': ':soccer:',
    '6': ':basketball:',
    '7': ':red_car:',
    '8': ':airplane:',
    '9': ':heart:',
    'a': ':smile:',
    'b': ':blush:',
    'c': ':joy:',
    'd': ':innocent:',
    'e': ':wink:',
    'f': ':heart_eyes:',
    'g': ':smiling_face_with_3_hearts:',
    'h': ':kissing_heart:',
    'i': ':yum:',
    'j': ':stuck_out_tongue_winking_eye:',
    'k': ':smirk:',
    'l': ':sunglasses:',
    'm': ':cry:',
    'n': ':thinking_face:',
    'o': ':shit:',
    'p': ':ghost:',
    'q': ':smiling_imp:',
    'r': ':money_mouth_face:',
    's': ':dog:',
    't': ':cat:',
    'u': ':hamster:',
    'v': ':see_no_evil:',
    'w': ':hear_no_evil:',
    'x': ':speak_no_evil:',
    'y': ':new_moon_with_face:',
    'z': ':peach:',
    ':smile:': 'a',
    ':blush:': 'b',
    ':joy:': 'c',
    ':innocent:': 'd',
    ':wink:': 'e',
    ':heart_eyes:': 'f',
    ':smiling_face_with_3_hearts:': 'g',
    ':kissing_heart:': 'h',
    ':yum:': 'i',
    ':stuck_out_tongue_winking_eye:': 'j',
    ':smirk:': 'k',
    ':sunglasses:': 'l',
    ':cry:': 'm',
    ':thinking_face:': 'n',
    ':shit:': 'o',
    ':ghost:': 'p',
    ':smiling_imp:': 'q',
    ':money_mouth_face:': 'r',
    ':dog:': 's',
    ':cat:': 't',
    ':hamster:': 'u',
    ':see_no_evil:': 'v',
    ':hear_no_evil:': 'w',
    ':speak_no_evil:': 'x',
    ':new_moon_with_face:': 'y',
    ':peach:': 'z',
    ':eggplant:': '0',
    ':banana:': '1',
    ':apple:': '2',
    ':popcorn:': '3',
    ':beer:': '4',
    ':soccer:': '5',
    ':basketball:': '6',
    ':red_car:': '7',
    ':airplane:': '8',
    ':heart:': '9'
}

function string2emoji(string) {
    string = string.split('');
    result = '';
    for (let i = 0; i < string.length; i++) {
        const char = emojiMap[string[i]];
        if (char) {
            result += char;
        }
    }

    return emoji.emojify(result);
}

function emoji2string(string) {
    string = emoji.unemojify(string).split(':').filter(e =>  e);
    result = '';
    for (let i = 0; i < string.length; i++) {
        const char = emojiMap[':' + string[i] + ':'];
        if (char) {
            result += char;
        }
    }

    return result
}

exports.string2emoji = string2emoji;
exports.emoji2string = emoji2string;