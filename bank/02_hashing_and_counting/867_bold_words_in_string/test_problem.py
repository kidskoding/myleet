from solution import bold_words


def test_bold_words_overlapping_keywords_merge():
    assert bold_words(["ab", "bc"], "aabcd") == "a<b>abc</b>d"


def test_bold_words_one_keyword_missing():
    assert bold_words(["ab", "cb"], "aabcd") == "a<b>ab</b>cd"


def test_bold_words_no_keywords():
    assert bold_words([], "abc") == "abc"


def test_bold_words_whole_string():
    assert bold_words(["a"], "aaa") == "<b>aaa</b>"


def test_bold_words_separate_blocks():
    assert bold_words(["ab", "cd"], "abxcd") == "<b>ab</b>x<b>cd</b>"


def test_bold_words_touching_blocks_merge():
    assert bold_words(["bc", "de"], "abcdef") == "a<b>bcde</b>f"
