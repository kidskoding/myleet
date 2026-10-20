from solution import Codec


def test_codec_roundtrip_normal():
    codec = Codec()
    strs = ["neet", "code", "love", "you"]
    assert codec.decode(codec.encode(strs)) == strs


def test_codec_roundtrip_empty():
    codec = Codec()
    assert codec.decode(codec.encode([])) == []


def test_codec_roundtrip_empty_strings():
    codec = Codec()
    strs = ["", "a", ""]
    assert codec.decode(codec.encode(strs)) == strs
