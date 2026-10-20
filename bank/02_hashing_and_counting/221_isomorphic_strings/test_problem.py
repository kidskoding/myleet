from solution import is_isomorphic


def test_is_isomorphic_true():
    assert is_isomorphic("egg", "add") is True
    assert is_isomorphic("paper", "title") is True


def test_is_isomorphic_conflicting_target():
    assert is_isomorphic("foo", "bar") is False


def test_is_isomorphic_two_sources_one_target():
    assert is_isomorphic("ab", "aa") is False


def test_is_isomorphic_reverse_conflict():
    assert is_isomorphic("badc", "baba") is False


def test_is_isomorphic_single_char():
    assert is_isomorphic("a", "a") is True
