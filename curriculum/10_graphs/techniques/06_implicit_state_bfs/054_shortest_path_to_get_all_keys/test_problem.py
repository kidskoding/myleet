from solution import shortest_path_all_keys


def test_shortest_path_all_keys_normal_case():
    assert shortest_path_all_keys(["@.a.#", "###.#", "b.A.B"]) == 8


def test_shortest_path_all_keys_no_keys():
    assert shortest_path_all_keys(["@..", "...", "..."]) == 0
