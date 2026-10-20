from solution import decode_message


def test_decode_message_pangram_key():
    assert decode_message("the quick brown fox jumps over the lazy dog", "vkbs bs t suepuv") == "this is a secret"


def test_decode_message_no_space_key():
    key = "eljuxhpwnyrdgtqkviszcfmabo"
    assert decode_message(key, "zwx hnfx lqantp mnoeius ycgk vcnjrdb") == "the five boxing wizards jump quickly"


def test_decode_message_identity_key():
    assert decode_message("abcdefghijklmnopqrstuvwxyz", "hello world") == "hello world"


def test_decode_message_only_spaces():
    assert decode_message("zyxwvutsrqponmlkjihgfedcba", "   ") == "   "


def test_decode_message_reversed_alphabet():
    assert decode_message("zyxwvutsrqponmlkjihgfedcba", "zyx") == "abc"
