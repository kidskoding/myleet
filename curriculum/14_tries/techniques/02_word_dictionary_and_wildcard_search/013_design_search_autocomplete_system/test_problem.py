from solution import AutocompleteSystem


def test_autocomplete_system_ranks_by_frequency():
    system = AutocompleteSystem(["i love you", "island", "iroman", "i love leetcode"], [5, 3, 2, 2])

    assert system.input("i") == ["i love you", "island", "i love leetcode"]
    assert system.input(" ") == ["i love you", "i love leetcode"]
    assert system.input("a") == []
    assert system.input("#") == []


def test_autocomplete_system_no_matches():
    system = AutocompleteSystem(["hello"], [5])

    assert system.input("z") == []


def test_autocomplete_system_records_new_sentence():
    system = AutocompleteSystem(["hi there"], [1])
    for char in "hi there":
        system.input(char)
    system.input("#")

    assert system.input("h") == ["hi there"]
