from solution import find_restaurant


def test_find_restaurant_single_common():
    list1 = ["Shogun", "Tapioca Express", "Burger King", "KFC"]
    list2 = ["Piatti", "The Grill at Torrey Pines", "Hungry Hunter Steakhouse", "Shogun"]
    assert find_restaurant(list1, list2) == ["Shogun"]


def test_find_restaurant_smallest_sum_wins():
    list1 = ["Shogun", "Tapioca Express", "Burger King", "KFC"]
    list2 = ["KFC", "Shogun", "Burger King"]
    assert find_restaurant(list1, list2) == ["Shogun"]


def test_find_restaurant_tie():
    assert sorted(find_restaurant(["happy", "sad", "good"], ["sad", "happy", "good"])) == ["happy", "sad"]


def test_find_restaurant_swapped_pair():
    assert sorted(find_restaurant(["a", "b"], ["b", "a"])) == ["a", "b"]


def test_find_restaurant_single_each():
    assert find_restaurant(["x"], ["x"]) == ["x"]
