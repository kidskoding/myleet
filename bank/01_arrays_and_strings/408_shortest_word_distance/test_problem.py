from solution import shortest_distance

WORDS = ["practice", "makes", "perfect", "coding", "makes"]


def test_shortest_distance_far_apart():
    assert shortest_distance(WORDS, "coding", "practice") == 3


def test_shortest_distance_repeated_word():
    assert shortest_distance(WORDS, "makes", "coding") == 1


def test_shortest_distance_two_words():
    assert shortest_distance(["a", "b"], "b", "a") == 1


def test_shortest_distance_later_pair_is_closer():
    words = ["a", "x", "x", "x", "b", "x", "a", "b"]
    assert shortest_distance(words, "a", "b") == 1


def test_shortest_distance_order_does_not_matter():
    assert shortest_distance(WORDS, "practice", "coding") == shortest_distance(WORDS, "coding", "practice")
