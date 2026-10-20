from solution import minimum_score


def test_minimum_score_remove_one_middle():
    assert minimum_score("abacaba", "bzaa") == 1


def test_minimum_score_remove_everything():
    assert minimum_score("cde", "xyz") == 3


def test_minimum_score_already_subsequence():
    assert minimum_score("abcde", "ace") == 0


def test_minimum_score_single_characters():
    assert minimum_score("a", "b") == 1


def test_minimum_score_reversed():
    assert minimum_score("abc", "cba") == 2


def test_minimum_score_t_longer_than_s():
    assert minimum_score("aaaa", "baaab") == 5


def test_minimum_score_extra_character():
    assert minimum_score("abcab", "abxcab") == 1
