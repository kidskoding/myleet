from solution import differ_by_one


def test_differ_by_one_found():
    assert differ_by_one(["abcd", "acbd", "aacd"]) is True


def test_differ_by_one_not_found():
    assert differ_by_one(["ab", "cd", "yz"]) is False


def test_differ_by_one_later_pair():
    assert differ_by_one(["abcd", "cccc", "abyd", "abab"]) is True


def test_differ_by_one_single_word():
    assert differ_by_one(["abc"]) is False


def test_differ_by_one_length_one():
    assert differ_by_one(["a", "b"]) is True


def test_differ_by_one_two_differences():
    assert differ_by_one(["abcd", "abdc"]) is False
