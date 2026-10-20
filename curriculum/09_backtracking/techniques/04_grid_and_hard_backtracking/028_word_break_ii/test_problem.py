from solution import word_break


def test_word_break_two_sentences():
    words = ["cat", "cats", "and", "sand", "dog"]
    assert sorted(word_break("catsanddog", words)) == ["cat sand dog", "cats and dog"]


def test_word_break_no_sentence():
    words = ["cats", "dog", "sand", "and", "cat"]
    assert word_break("catsandog", words) == []
