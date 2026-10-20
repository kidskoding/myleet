from solution import shortest_word_distance

WORDS = ["practice", "makes", "perfect", "coding", "makes"]


def test_shortest_word_distance_different_words():
    assert shortest_word_distance(WORDS, "makes", "coding") == 1


def test_shortest_word_distance_same_word():
    assert shortest_word_distance(WORDS, "makes", "makes") == 3


def test_shortest_word_distance_same_word_adjacent():
    assert shortest_word_distance(["a", "a"], "a", "a") == 1


def test_shortest_word_distance_two_words():
    assert shortest_word_distance(["a", "b"], "a", "b") == 1


def test_shortest_word_distance_later_pair_closer():
    assert shortest_word_distance(["a", "x", "x", "b", "x", "a"], "a", "b") == 2


def test_shortest_word_distance_argument_order_irrelevant():
    assert shortest_word_distance(["a", "c", "b", "a"], "b", "a") == 1
