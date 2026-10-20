from solution import find_all_recipes


def test_find_all_recipes_single():
    assert find_all_recipes(["bread"], [["yeast", "flour"]], ["yeast", "flour", "corn"]) == ["bread"]


def test_find_all_recipes_recipe_as_ingredient():
    result = find_all_recipes(["bread", "sandwich"], [["yeast", "flour"], ["bread", "meat"]], ["yeast", "flour", "meat"])
    assert sorted(result) == ["bread", "sandwich"]


def test_find_all_recipes_chain_of_three():
    result = find_all_recipes(
        ["bread", "sandwich", "burger"],
        [["yeast", "flour"], ["bread", "meat"], ["sandwich", "meat", "bread"]],
        ["yeast", "flour", "meat"],
    )
    assert sorted(result) == ["bread", "burger", "sandwich"]


def test_find_all_recipes_cycle():
    assert find_all_recipes(["a", "b"], [["b"], ["a"]], ["x"]) == []


def test_find_all_recipes_missing_supply():
    assert find_all_recipes(["cake", "tea"], [["egg", "milk"], ["leaf"]], ["egg", "leaf"]) == ["tea"]
