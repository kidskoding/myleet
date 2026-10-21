from solution import most_popular_creator


def test_most_popular_creator_two_tied():
    assert sorted(
        most_popular_creator(
            ["alice", "bob", "alice", "chris"],
            ["one", "two", "three", "four"],
            [5, 10, 5, 4],
        )
    ) == sorted([["alice", "one"], ["bob", "two"]])


def test_most_popular_creator_single_winner():
    assert most_popular_creator(
        ["alice", "alice", "alice"],
        ["a", "b", "c"],
        [1, 2, 2],
    ) == [["alice", "b"]]


def test_most_popular_creator_lex_smallest_id():
    assert most_popular_creator(
        ["a"],
        ["z"],
        [100],
    ) == [["a", "z"]]


def test_most_popular_creator_tie_ids_same_views():
    result = most_popular_creator(
        ["x", "x"],
        ["bb", "aa"],
        [3, 3],
    )
    assert result == [["x", "aa"]]


def test_most_popular_creator_multiple_creators():
    assert sorted(
        most_popular_creator(
            ["a", "b"],
            ["x", "y"],
            [1, 1],
        )
    ) == sorted([["a", "x"], ["b", "y"]])
