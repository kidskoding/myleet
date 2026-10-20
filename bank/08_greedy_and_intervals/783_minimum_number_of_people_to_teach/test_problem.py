from solution import minimum_teachings


def test_minimum_teachings_two_languages():
    assert minimum_teachings(2, [[1], [2], [1, 2]], [[1, 2], [1, 3], [2, 3]]) == 1


def test_minimum_teachings_three_languages():
    assert minimum_teachings(3, [[2], [1, 3], [1, 2], [3]], [[1, 4], [1, 2], [3, 4], [2, 3]]) == 2


def test_minimum_teachings_everyone_can_talk():
    assert minimum_teachings(2, [[1], [1]], [[1, 2]]) == 0


def test_minimum_teachings_single_pair():
    assert minimum_teachings(2, [[1], [2]], [[1, 2]]) == 1


def test_minimum_teachings_new_language_needed():
    assert minimum_teachings(3, [[1], [2], [3]], [[1, 2], [2, 3]]) == 2
