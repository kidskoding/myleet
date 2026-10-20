from solution import get_folder_names


def test_get_folder_names_all_unique():
    assert get_folder_names(["pes", "fifa", "gta", "pes(2019)"]) == ["pes", "fifa", "gta", "pes(2019)"]


def test_get_folder_names_skip_taken_suffix():
    assert get_folder_names(["gta", "gta(1)", "gta", "avalon"]) == ["gta", "gta(1)", "gta(2)", "avalon"]


def test_get_folder_names_many_taken_suffixes():
    names = ["onepiece", "onepiece(1)", "onepiece(2)", "onepiece(3)", "onepiece"]
    assert get_folder_names(names) == ["onepiece", "onepiece(1)", "onepiece(2)", "onepiece(3)", "onepiece(4)"]


def test_get_folder_names_single():
    assert get_folder_names(["a"]) == ["a"]


def test_get_folder_names_generated_name_requested_again():
    assert get_folder_names(["a", "a", "a(1)"]) == ["a", "a(1)", "a(1)(1)"]


def test_get_folder_names_repeated_many_times():
    assert get_folder_names(["x", "x", "x", "x(2)", "x"]) == ["x", "x(1)", "x(2)", "x(2)(1)", "x(3)"]
