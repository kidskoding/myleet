from solution import min_steps


def test_min_steps_one_change():
    assert min_steps("bab", "aba") == 1


def test_min_steps_many_changes():
    assert min_steps("leetcode", "practice") == 5


def test_min_steps_already_anagram():
    assert min_steps("anagram", "mangaar") == 0


def test_min_steps_single_letters():
    assert min_steps("a", "b") == 1


def test_min_steps_identical():
    assert min_steps("abc", "abc") == 0
