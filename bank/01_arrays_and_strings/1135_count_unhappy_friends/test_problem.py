from solution import unhappy_friends


def test_unhappy_friends_two_unhappy():
    preferences = [[1, 2, 3], [3, 2, 0], [3, 1, 0], [1, 2, 0]]
    assert unhappy_friends(4, preferences, [[0, 1], [2, 3]]) == 2


def test_unhappy_friends_single_pair():
    assert unhappy_friends(2, [[1], [0]], [[1, 0]]) == 0


def test_unhappy_friends_everyone_unhappy():
    preferences = [[1, 3, 2], [2, 3, 0], [1, 3, 0], [0, 2, 1]]
    assert unhappy_friends(4, preferences, [[1, 3], [0, 2]]) == 4


def test_unhappy_friends_everyone_with_first_choice():
    preferences = [[1, 2, 3], [0, 2, 3], [3, 0, 1], [2, 0, 1]]
    assert unhappy_friends(4, preferences, [[0, 1], [2, 3]]) == 0


def test_unhappy_friends_preference_must_be_mutual():
    preferences = [[2, 1, 3], [0, 2, 3], [3, 0, 1], [2, 0, 1]]
    assert unhappy_friends(4, preferences, [[0, 1], [2, 3]]) == 0
