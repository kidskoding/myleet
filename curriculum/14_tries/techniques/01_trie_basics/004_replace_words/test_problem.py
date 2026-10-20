from solution import replace_words


def test_replace_words_normal():
    dictionary = ["cat", "bat", "rat"]
    sentence = "the cattle was rattled by the battery"
    assert replace_words(dictionary, sentence) == "the cat was rat by the bat"


def test_replace_words_no_matching_root():
    dictionary = ["a", "b", "c"]
    sentence = "aadsfasf absbs bbab cadsfafs"
    assert replace_words(dictionary, sentence) == "a a b c"


def test_replace_words_shortest_root_wins():
    dictionary = ["cat", "ca"]
    sentence = "cattle"
    assert replace_words(dictionary, sentence) == "ca"
