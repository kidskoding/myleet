from list_node import ListNode
from solution import merge_in_between


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def to_list(head: ListNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_merge_in_between_normal():
    list1 = build_list([0, 1, 2, 3, 4, 5])
    list2 = build_list([1000000, 1000001, 1000002])

    merged = merge_in_between(list1, 3, 4, list2)
    assert to_list(merged) == [0, 1, 2, 1000000, 1000001, 1000002, 5]


def test_merge_in_between_wider_cut():
    list1 = build_list([0, 1, 2, 3, 4, 5, 6])
    list2 = build_list([1000000, 1000001, 1000002, 1000003, 1000004])

    merged = merge_in_between(list1, 2, 5, list2)
    assert to_list(merged) == [0, 1, 1000000, 1000001, 1000002, 1000003, 1000004, 6]
