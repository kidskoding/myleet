from solution import FoodRatings


def make_example():
    return FoodRatings(
        ["kimchi", "miso", "sushi", "moussaka", "ramen", "bulgogi"],
        ["korean", "japanese", "japanese", "greek", "japanese", "korean"],
        [9, 12, 8, 15, 14, 7],
    )


def test_food_ratings_example():
    ratings = make_example()
    assert ratings.highest_rated("korean") == "kimchi"
    assert ratings.highest_rated("japanese") == "ramen"
    ratings.change_rating("sushi", 16)
    assert ratings.highest_rated("japanese") == "sushi"
    ratings.change_rating("ramen", 16)
    assert ratings.highest_rated("japanese") == "ramen"


def test_food_ratings_single_food_cuisine():
    assert make_example().highest_rated("greek") == "moussaka"


def test_food_ratings_lowering_top_rating():
    ratings = make_example()
    ratings.change_rating("ramen", 1)
    assert ratings.highest_rated("japanese") == "miso"


def test_food_ratings_initial_tie_breaks_by_name():
    ratings = FoodRatings(["b", "a", "c"], ["x", "x", "x"], [5, 5, 5])
    assert ratings.highest_rated("x") == "a"


def test_food_ratings_repeated_changes_use_latest():
    ratings = FoodRatings(["a", "b"], ["x", "x"], [1, 2])
    ratings.change_rating("a", 10)
    ratings.change_rating("a", 0)
    assert ratings.highest_rated("x") == "b"
    ratings.change_rating("b", 0)
    assert ratings.highest_rated("x") == "a"
