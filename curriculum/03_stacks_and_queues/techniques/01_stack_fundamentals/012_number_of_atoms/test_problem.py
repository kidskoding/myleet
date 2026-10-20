from solution import count_of_atoms


def test_count_of_atoms_simple():
    assert count_of_atoms("H2O") == "H2O"


def test_count_of_atoms_with_group():
    assert count_of_atoms("Mg(OH)2") == "H2MgO2"


def test_count_of_atoms_nested_groups():
    assert count_of_atoms("K4(ON(SO3)2)2") == "K4N2O14S4"
