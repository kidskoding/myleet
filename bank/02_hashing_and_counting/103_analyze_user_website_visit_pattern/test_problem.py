from solution import most_visited_pattern


def test_most_visited_pattern_shared_by_two_users():
    username = ["ann", "ann", "ann", "bob", "bob", "bob", "bob"]
    timestamp = [1, 2, 3, 4, 5, 6, 7]
    website = ["home", "shop", "cart", "home", "shop", "cart", "pay"]
    assert most_visited_pattern(username, timestamp, website) == ["home", "shop", "cart"]


def test_most_visited_pattern_tie_breaks_lexicographically():
    username = ["u", "u", "u", "v", "v", "v"]
    timestamp = [1, 2, 3, 4, 5, 6]
    website = ["b", "c", "d", "a", "b", "c"]
    assert most_visited_pattern(username, timestamp, website) == ["a", "b", "c"]


def test_most_visited_pattern_orders_by_timestamp_not_input():
    assert most_visited_pattern(["x", "x", "x"], [30, 10, 20], ["c", "a", "b"]) == ["a", "b", "c"]


def test_most_visited_pattern_counts_a_user_once_per_pattern():
    username = ["p", "p", "p", "p", "q", "q", "q", "r", "r", "r"]
    timestamp = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    website = ["a", "a", "a", "a", "b", "b", "b", "b", "b", "b"]
    assert most_visited_pattern(username, timestamp, website) == ["b", "b", "b"]


def test_most_visited_pattern_repeated_sites_allowed():
    username = ["p", "p", "p", "p", "q", "q", "q"]
    timestamp = [1, 2, 3, 4, 5, 6, 7]
    website = ["a", "b", "a", "b", "a", "a", "b"]
    assert most_visited_pattern(username, timestamp, website) == ["a", "a", "b"]
