from solution import Encrypter


def make_example():
    return Encrypter(
        ["a", "b", "c", "d"],
        ["ei", "zf", "ei", "am"],
        ["abcd", "acbd", "adbc", "badc", "dacb", "cadb", "cbda", "abad"],
    )


def test_encrypter_example():
    encrypter = make_example()
    assert encrypter.encrypt("abcd") == "eizfeiam"
    assert encrypter.decrypt("eizfeiam") == 2


def test_encrypter_missing_key_gives_empty():
    assert make_example().encrypt("abe") == ""


def test_encrypter_decrypt_no_dictionary_match():
    encrypter = make_example()
    assert encrypter.decrypt("zfzf") == 0
    assert encrypter.decrypt("xx") == 0


def test_encrypter_decrypt_single_letter_words():
    encrypter = Encrypter(["a", "b", "c"], ["xy", "xy", "zz"], ["a", "b", "c", "ab"])
    assert encrypter.decrypt("xy") == 2
    assert encrypter.decrypt("zz") == 1
    assert encrypter.decrypt("xyxy") == 1


def test_encrypter_dictionary_word_with_unknown_letter_never_counted():
    encrypter = Encrypter(["a"], ["qq"], ["a", "aq"])
    assert encrypter.encrypt("aa") == "qqqq"
    assert encrypter.decrypt("qq") == 1
