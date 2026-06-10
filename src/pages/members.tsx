import { useState } from "react";
import { useListMembers, useUpsertMember, useDeleteMember, useSetMemberLeave, getListMembersQueryKey } from "@/api-client";
import type { TeamMember } from "@/api-client/generated/api.schemas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Edit2, Trash2, ShieldAlert, PlaneTakeoff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const formSchema = z.object({
  nik: z.string().min(1, "NIK wajib diisi"),
  name: z.string().min(1, "Nama wajib diisi"),
  department: z.string().min(1, "Departemen wajib diisi"),
  jabatan: z.string().min(1, "Jabatan wajib diisi"),
  isPjo: z.boolean().default(false),
  targetHazard: z.coerce.number().min(0),
  targetInspeksi: z.coerce.number().min(0),
  targetObservasi: z.coerce.number().min(0),
  targetOpk: z.coerce.number().min(0),
});

export default function Members() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const { data: members, isLoading } = useListMembers({ query: { queryKey: getListMembersQueryKey() } });

  const upsertMember = useUpsertMember();
  const deleteMember = useDeleteMember();
  const setLeave = useSetMemberLeave();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nik: "",
      name: "",
      department: "Operation",
      jabatan: "",
      isPjo: false,
      targetHazard: 0,
      targetInspeksi: 0,
      targetObservasi: 0,
      targetOpk: 0,
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    upsertMember.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Anggota disimpan" });
        setIsDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      },
      onError: () => {
        toast({ title: "Gagal menyimpan", variant: "destructive" });
      }
    });
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    form.reset({
      nik: member.nik,
      name: member.name,
      department: member.department,
      jabatan: member.jabatan,
      isPjo: member.isPjo,
      targetHazard: member.targetHazard,
      targetInspeksi: member.targetInspeksi,
      targetObservasi: member.targetObservasi,
      targetOpk: member.targetOpk,
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingMember(null);
    form.reset({
      nik: "",
      name: "",
      department: "Operation",
      jabatan: "",
      isPjo: false,
      targetHazard: 0,
      targetInspeksi: 0,
      targetObservasi: 0,
      targetOpk: 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (nik: string) => {
    deleteMember.mutate({ nik }, {
      onSuccess: () => {
        toast({ title: "Anggota dihapus" });
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      },
      onError: () => {
        toast({ title: "Gagal menghapus", variant: "destructive" });
      }
    });
  };

  const handleToggleLeave = (member: TeamMember) => {
    const nextLeave = !member.isOnLeave;
    setLeave.mutate({ nik: member.nik, data: { isOnLeave: nextLeave } }, {
      onSuccess: () => {
        toast({
          title: nextLeave ? `${member.name} ditandai CUTI` : `${member.name} kembali aktif`,
        });
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      },
      onError: () => {
        toast({ title: "Gagal mengubah status cuti", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kelola Anggota Tim</h1>
          <p className="text-muted-foreground mt-1">Daftar tim Minergo dan target mingguan SAP</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Anggota
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingMember ? 'Edit Anggota' : 'Tambah Anggota Baru'}</DialogTitle>
              <DialogDescription>
                Masukkan NIK, nama, jabatan dan target laporan mingguan.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nik"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIK</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!!editingMember} placeholder="Contoh: C-012345" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Lengkap</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nama lengkap" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departemen</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Operation" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jabatan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jabatan</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Contoh: Supervisor" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isPjo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>PJO (Penanggung Jawab Operasional)</FormLabel>
                        <p className="text-[10px] text-muted-foreground">PJO tidak memiliki target OPK</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="pt-2 border-t">
                  <h4 className="text-sm font-semibold mb-3">Target Mingguan</h4>
                  <div className="grid grid-cols-4 gap-3">
                    <FormField control={form.control} name="targetHazard" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Hazard</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="targetInspeksi" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Inspeksi</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="targetObservasi" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Observasi</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="targetOpk" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">OPK</FormLabel>
                        <FormControl><Input type="number" {...field} disabled={form.watch('isPjo')} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                  <Button type="submit">{upsertMember.isPending ? "Menyimpan..." : "Simpan"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>NIK / Dept</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead className="text-center">Hazard</TableHead>
                <TableHead className="text-center">Inspeksi</TableHead>
                <TableHead className="text-center">Observasi</TableHead>
                <TableHead className="text-center">OPK</TableHead>
                <TableHead className="text-center">Cuti</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">Memuat data...</TableCell>
                </TableRow>
              ) : members && members.length > 0 ? (
                members.map((member) => (
                  <TableRow key={member.nik} className={member.isOnLeave ? "opacity-60 bg-muted/20" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {member.name}
                        {member.isPjo && <ShieldAlert className="h-3.5 w-3.5 text-primary" title="PJO" />}
                        {member.isOnLeave && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-400 text-amber-600 gap-1">
                            <PlaneTakeoff className="h-2.5 w-2.5" />
                            CUTI
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{member.nik}</div>
                      <div className="text-xs text-muted-foreground">{member.department}</div>
                    </TableCell>
                    <TableCell>{member.jabatan}</TableCell>
                    <TableCell className="text-center">{member.targetHazard}</TableCell>
                    <TableCell className="text-center">{member.targetInspeksi}</TableCell>
                    <TableCell className="text-center">{member.targetObservasi}</TableCell>
                    <TableCell className="text-center">{member.isPjo ? <span className="text-muted-foreground">-</span> : member.targetOpk}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={member.isOnLeave}
                        onCheckedChange={() => handleToggleLeave(member)}
                        disabled={setLeave.isPending}
                        className="data-[state=checked]:bg-amber-500"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(member)}>
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Anggota?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Apakah Anda yakin ingin menghapus {member.name}? Data yang dihapus tidak dapat dikembalikan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(member.nik)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Belum ada data anggota tim.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
