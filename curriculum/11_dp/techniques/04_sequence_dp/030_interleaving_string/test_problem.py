from solution import is_interleave


def test_is_interleave_true():
    assert is_interleave("aabcc", "dbbca", "aadbbcbcac") is True


def test_is_interleave_false():
    assert is_interleave("aabcc", "dbbca", "aadbbbaccc") is False


def test_is_interleave_empty_all():
    assert is_interleave("", "", "") is True
