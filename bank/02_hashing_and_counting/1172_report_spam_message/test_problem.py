from solution import report_spam


def test_report_spam_two_matches():
    assert report_spam(["hello", "world", "leetcode"], ["world", "hello"]) is True


def test_report_spam_one_match():
    assert report_spam(["hello", "programming", "fun"], ["world", "programming", "leetcode"]) is False


def test_report_spam_repeated_word_counts_twice():
    assert report_spam(["spam", "spam"], ["spam"]) is True


def test_report_spam_single_word():
    assert report_spam(["x"], ["x"]) is False


def test_report_spam_no_matches():
    assert report_spam(["a", "b", "c"], ["d", "e"]) is False
