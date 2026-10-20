from solution import WordDistance


def test_word_distance_example():
    wd = WordDistance(["practice", "makes", "perfect", "coding", "makes"])
    assert wd.shortest("coding", "practice") == 3
    assert wd.shortest("makes", "coding") == 1


def test_word_distance_adjacent():
    wd = WordDistance(["a", "b"])
    assert wd.shortest("a", "b") == 1


def test_word_distance_order_of_arguments():
    wd = WordDistance(["x", "q", "q", "y"])
    assert wd.shortest("x", "y") == 3
    assert wd.shortest("y", "x") == 3


def test_word_distance_many_occurrences():
    wd = WordDistance(["a", "c", "c", "c", "b", "c", "c", "a", "c", "b"])
    assert wd.shortest("a", "b") == 2


def test_word_distance_repeated_queries():
    wd = WordDistance(["the", "quick", "brown", "fox", "quick"])
    assert wd.shortest("fox", "quick") == 1
    assert wd.shortest("the", "fox") == 3
    assert wd.shortest("the", "quick") == 1
